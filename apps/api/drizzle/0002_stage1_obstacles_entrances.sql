CREATE TABLE "entrances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"house" geometry(Point,4326) NOT NULL,
	"entrance" geometry(Point,4326) NOT NULL,
	"label" text,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obstacle_confirmations" (
	"obstacle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obstacle_confirmations_obstacle_id_user_id_pk" PRIMARY KEY("obstacle_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "obstacles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"kind" text NOT NULL,
	"geom" geometry(Polygon,4326) NOT NULL,
	"center" geometry(Point,4326) NOT NULL,
	"radius_m" integer,
	"comment" text,
	"photo_key" text,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"removed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entrances" ADD CONSTRAINT "entrances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrances" ADD CONSTRAINT "entrances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obstacle_confirmations" ADD CONSTRAINT "obstacle_confirmations_obstacle_id_obstacles_id_fk" FOREIGN KEY ("obstacle_id") REFERENCES "public"."obstacles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obstacle_confirmations" ADD CONSTRAINT "obstacle_confirmations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obstacles" ADD CONSTRAINT "obstacles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obstacles" ADD CONSTRAINT "obstacles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entrances_house_gist_idx" ON "entrances" USING gist ("house");--> statement-breakpoint
CREATE INDEX "entrances_tenant_idx" ON "entrances" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "obstacles_geom_gist_idx" ON "obstacles" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "obstacles_tenant_status_idx" ON "obstacles" USING btree ("tenant_id","status");