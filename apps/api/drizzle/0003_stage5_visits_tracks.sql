CREATE TABLE "delivery_visits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"courier_id" uuid NOT NULL,
	"destination" geometry(Point,4326) NOT NULL,
	"label" text,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"arrived_at" timestamp with time zone,
	"door_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_points" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"visit_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"courier_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"geom" geometry(Point,4326) NOT NULL,
	"accuracy_m" real,
	CONSTRAINT "track_points_visit_time_unique" UNIQUE("visit_id","recorded_at")
);
--> statement-breakpoint
ALTER TABLE "delivery_visits" ADD CONSTRAINT "delivery_visits_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_visits" ADD CONSTRAINT "delivery_visits_courier_id_users_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_points" ADD CONSTRAINT "track_points_visit_id_delivery_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."delivery_visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_points" ADD CONSTRAINT "track_points_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_points" ADD CONSTRAINT "track_points_courier_id_users_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_visits_tenant_started_idx" ON "delivery_visits" USING btree ("tenant_id","started_at");--> statement-breakpoint
CREATE INDEX "track_points_recorded_at_idx" ON "track_points" USING btree ("recorded_at");