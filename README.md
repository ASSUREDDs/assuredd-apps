# Assuredd Monorepo

A pnpm monorepo holding a NestJS backend and a React Native (Expo) mobile app that share the same TypeScript contracts.

The whole point of this setup is the shared contracts package. API request and response shapes are defined once as zod schemas. The backend validates incoming requests with them, the mobile app parses responses with them, and CI type checks both apps together. If someone changes a field name, the build breaks immediately instead of failing silently in production.

---

## Table of contents

1. [Stack](#stack)
2. [Prerequisites](#prerequisites)
3. [Repository layout](#repository-layout)
4. [Quick start](#quick-start)
5. [Package manager notes](#package-manager-notes)
6. [Shared contracts](#shared-contracts)
7. [Backend](#backend)
8. [Mobile](#mobile)
9. [Docker](#docker)
10. [CI](#ci)
11. [Deployment](#deployment)
12. [Conventions](#conventions)
13. [Troubleshooting](#troubleshooting)

---

## Stack

| Area | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Runtime | Node 22 LTS |
| Backend | NestJS 11, Drizzle ORM, PostgreSQL 17 |
| Validation | zod 4 (shared between apps) |
| Mobile | Expo SDK 57, React Native 0.86, React 19.2 |
| Navigation | Expo Router (file based, typed routes) |
| Server state | TanStack Query |
| Architecture (backend) | Clean architecture, layers at the top level |
| Architecture (mobile) | Feature Sliced Design |
| Boundary enforcement | eslint-plugin-boundaries (both apps) |
| Packaging | Docker multi stage |
| Hosting | Railway now, DigitalOcean later |

---

## Prerequisites

Install these before you start. Versions matter more than usual here, because React Native is sensitive to the native toolchain.

```bash
# Node 22 and pnpm
node -v            # v22.x
corepack enable    # pnpm comes from the packageManager field in package.json
pnpm -v

# Docker (for the local database)
docker --version
```

**For iOS builds:**

- Xcode 26 or newer. React Native 0.86 needs Swift tools 6.2, and Xcode 16 ships 6.0. An older Xcode fails with `package 'apple' is using Swift tools version 6.2.0 but the installed version is 6.0.0`.
- The iOS platform SDK. Xcode does not install it by default. Run `xcodebuild -downloadPlatform iOS` or use Xcode Settings, then Components.
- Ruby 3.3 and CocoaPods. Do not use Ruby 4, CocoaPods 1.17 does not work on it yet.

```bash
brew install ruby@3.3
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"   # add this to ~/.zshrc
gem install cocoapods --no-document
pod --version
```

**For Android builds:**

- Java 17. Not 21, not 24.
- Android Studio with SDK Platform 36, Platform Tools, Build Tools and Emulator.

```bash
brew install --cask temurin@17
brew install --cask android-studio
```

Add to `~/.zshrc`:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

Then open Android Studio once and finish the setup wizard so it downloads the SDK. Until you do, `adb` will not exist.

---

## Repository layout

```
assuredd-apps/
  package.json              root scripts, packageManager field
  pnpm-workspace.yaml
  turbo.json
  .npmrc                    node-linker=hoisted
  .dockerignore
  Dockerfile                backend image, built from the repo root
  docker-compose.yml        postgres + api for local use
  .github/workflows/ci.yml

  packages/
    contracts/              shared zod schemas and types
      src/
        auth.ts
        index.ts
      package.json
      tsconfig.json

  apps/
    api/                    NestJS backend
    mobile/                 Expo app
```

Everything the two apps share lives in `packages/`. Anything that belongs to only one of them stays inside its app.

---

## Quick start

```bash
git clone <repo>
cd assuredd-apps

pnpm install

# build the shared package first, both apps import its dist folder
pnpm --filter @app/contracts build

# start the local database
docker compose up -d db

# copy the env template and fill it in
cp apps/api/.env.example apps/api/.env

# run everything in watch mode
pnpm dev
```

`pnpm dev` starts three processes at once through Turborepo: `tsc -w` for contracts, Nest in watch mode, and Metro for the mobile app.

One caveat: when Metro runs under Turborepo it loses the interactive keys (`i` for iOS, `r` for reload) because stdin is taken. If that bothers you, run the mobile app in its own terminal and start only the backend from the root:

```bash
pnpm turbo dev --filter=@app/api --filter=@app/contracts
```

---

## Package manager notes

### Why node-linker=hoisted

The root `.npmrc` contains:

```
node-linker=hoisted
```

pnpm normally puts every package in an isolated store and links it with symlinks. Metro, the React Native bundler, does not follow those symlinks reliably. Without this setting you get errors like:

```
Unable to resolve "expo-modules-core" from ".../node_modules/expo/src/Expo.ts"
```

The cost is that strict dependency isolation is gone. A package can import something it did not declare in its own `package.json`. This is a known trade off in the React Native ecosystem and Expo recommends the same thing for pnpm monorepos.

It does not affect the backend image. `pnpm deploy` builds an isolated artifact regardless of the linker.

If you ever change this setting, wipe everything first, otherwise pnpm keeps the old structure:

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install
```

### Turborepo

`turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build":     { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test":      { "dependsOn": ["^build"] },
    "lint":      {},
    "dev":       { "cache": false, "persistent": true }
  }
}
```

`dependsOn: ["^build"]` means "build my dependencies first". That is why `typecheck` on the API always sees a fresh `contracts/dist`.

Every package must have a script for every task listed here, otherwise Turborepo fails. Use `"echo skip"` as a placeholder where a real script does not exist yet.

---

## Shared contracts

`packages/contracts` is the reason the monorepo exists. It holds zod schemas and the types inferred from them.

### Rules

- Only put things both sides need: request schemas, response schemas, enums, error codes.
- No database code, no Nest imports, no React imports. The moment a server dependency leaks in here, Metro will choke on it.
- The package is compiled to CommonJS. Nest reads it with tsc, Metro reads it without complaining. ESM in a monorepo with React Native costs you a day of debugging for no benefit.

### package.json

```json
{
  "name": "@app/contracts",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -w -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "echo skip",
    "test": "echo skip"
  },
  "dependencies": {
    "zod": "^4.0.0"
  }
}
```

The `files` field matters for Docker. `pnpm deploy` copies only what is listed there.

### Example schema

```ts
// packages/contracts/src/auth.ts
import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Minimum 8 characters'),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.uuid(),
    email: z.email(),
  }),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
```

Note the zod 4 style. `z.email()` and `z.uuid()` at the top level replaced `z.string().email()`. The old form still works but is deprecated.

### Workflow

Contracts are compiled, not read as source. After changing a schema you must rebuild before the API or the app sees it:

```bash
pnpm --filter @app/contracts build
```

During development keep `tsc -w` running instead. `pnpm dev` from the root does that for you.

### Verifying the link works

This is worth doing once, and worth repeating whenever you touch the build setup:

1. Rename `accessToken` to `token` in the schema.
2. Run `pnpm --filter @app/contracts build`.
3. Run `pnpm turbo typecheck` from the root.

Both `@app/api` and `@app/mobile` should fail. If only one fails, or neither does, the wiring is broken and you should fix it now rather than in three months.

---

## Backend

### Architecture

Clean architecture with layers at the top level. Slices (auth, orders, billing) live inside each layer.

```
apps/api/src/
  main.ts
  app.module.ts

  domain/                   pure TypeScript, zero external dependencies
    shared/
      result.ts
      domain-error.ts
    auth/
      user.entity.ts
      email.vo.ts
      user.repository.ts    port (interface + Symbol token)

  application/              use cases, depends only on domain
    shared/
      ports/
        clock.port.ts
        id-generator.port.ts
    auth/
      login.usecase.ts
      ports/
        password-hasher.port.ts

  infrastructure/           adapters, config, database
    config/
      env.schema.ts
      config.module.ts
      index.ts
    db/
      db.tokens.ts
      db.module.ts
      index.ts
    auth/
      drizzle-user.repository.ts
      argon-hasher.ts

  presentation/             HTTP controllers and Nest modules
    health/
      health.controller.ts
      health.module.ts
    auth/
      auth.controller.ts
      auth.module.ts
```

The dependency rule:

- `domain` imports nothing. No Nest, no drizzle, no zod, no external package at all.
- `application` imports only `domain`, plus `@nestjs/common` for the `@Injectable` and `@Inject` decorators. That is a pragmatic compromise, the alternative is manual factories and twice the code.
- `infrastructure` may import everything below it. A repository legitimately needs the domain port, the database schema and the config.
- `presentation` may import everything. The Nest module is the composition root: it binds port tokens to concrete implementations.

Note that `shared` is a folder inside each layer, not a top level folder. A shared `Result` type is a domain concept, a shared `Clock` is an application port, config and the connection pool are infrastructure. If you pull `shared` to the top level, everything eventually drains into it and the dependency rule breaks there first.

### Ports and dependency injection

TypeScript interfaces do not exist at runtime, so you cannot inject by type. Use a Symbol token next to the interface:

```ts
// domain/auth/user.repository.ts
import type { User } from './user.entity';
import type { Email } from './email.vo';

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('UserRepository');
```

```ts
// application/auth/login.usecase.ts
import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, type UserRepository } from '../../domain/auth/user.repository';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}
}
```

```ts
// presentation/auth/auth.module.ts
@Module({
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
  ],
})
export class AuthModule {}
```

The Symbol technically lives in the domain, which is a small purity violation. Everybody does it anyway, because the alternative is a separate token layer that improves nothing.

### Config not being injected directly

Use cases must not depend on `ConfigService`. Give them a narrow port instead, and build it from config in an infrastructure factory:

```ts
// application/auth/ports/token-config.port.ts
export interface TokenConfig {
  readonly accessTtlSec: number;
  readonly refreshTtlSec: number;
}
export const TOKEN_CONFIG = Symbol('TokenConfig');
```

```ts
// presentation/auth/auth.module.ts
{
  provide: TOKEN_CONFIG,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService<Env, true>): TokenConfig => ({
    accessTtlSec: cfg.get('ACCESS_TTL_SEC', { infer: true }),
    refreshTtlSec: cfg.get('REFRESH_TTL_SEC', { infer: true }),
  }),
}
```

### Environment configuration

The app refuses to start if the environment is wrong. This makes deploys safer: a missing variable means the container never comes up, and the old version keeps serving traffic.

```ts
// infrastructure/config/env.schema.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Wrong env:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
```

```ts
// infrastructure/config/config.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
```

A few notes:

- `cache: true` stops `ConfigService.get` from reading `process.env` on every call.
- `.env.local` overrides `.env`. Commit `.env.example`, never commit `.env` or `.env.local`.
- On Railway and DigitalOcean there are no env files at all, the variables come from the platform. `@nestjs/config` handles that automatically.
- Because `validate` returns the parsed object, `cfg.get('PORT')` gives you a real number, not a string. That is the whole point of `z.coerce.number()`.
- The schema does not need `.strict()`. It receives all of `process.env` and should ignore the system variables it does not care about.

Reading config with types:

```ts
constructor(private readonly cfg: ConfigService<Env, true>) {}
// cfg.get('PORT', { infer: true }) is typed as number
```

### main.ts

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { Env } from '@infrastructure/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const cfg = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(cfg.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();
```

Two details that are easy to miss:

- `enableShutdownHooks()` lets the Postgres pool close cleanly when the container stops. Without it the platform kills the process with open connections.
- Binding to `0.0.0.0` is required inside Docker. Node listens on localhost by default, which is unreachable from outside the container.

### Database

Drizzle over `pg`, wired through a global Nest module.

```ts
// infrastructure/db/db.tokens.ts
export const DB = Symbol('DB');
export const PG_POOL = Symbol('PG_POOL');
```

```ts
// infrastructure/db/db.module.ts
import { Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Env } from '../config';
import { DB, PG_POOL } from './db.tokens';

export type Database = NodePgDatabase<Record<string, never>>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<Env, true>) =>
        new Pool({
          connectionString: cfg.get('DATABASE_URL', { infer: true }),
          max: 10,
        }),
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool),
    },
  ],
  exports: [DB, PG_POOL],
})
export class DbModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    await this.moduleRef.get<Pool>(PG_POOL).end();
  }
}
```

Once schemas exist, change the type to `NodePgDatabase<typeof schema>` and pass `drizzle(pool, { schema })`.

`drizzle.config.ts`:

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/db/schema/*.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

The `drizzle/` folder holds generated SQL migrations. **Commit it.** It is the history of your schema, and without it migrations cannot be reproduced on the server.

### Migrations

Two different runners, on purpose.

**Development** uses drizzle-kit:

```json
"db:generate": "drizzle-kit generate",
"db:migrate":  "drizzle-kit migrate",
"db:studio":   "drizzle-kit studio"
```

**Production** does not. `drizzle-kit` is a dev dependency and the production image does not have dev dependencies, so the CLI is simply not there. Use a small standalone script that is compiled together with the app:

```ts
// apps/api/src/migrate.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
    console.log('migrations applied');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

```json
"db:migrate:prod": "node dist/migrate"
```

Add `src/migrate.ts` to the eslint `ignores` list. It is an entry point, not part of the architecture, so the boundary rules do not apply.

**Do not run migrations from the container start command.** With more than one replica they race each other, and they rerun on every restart (OOM kill, failed health check, autoscaling). Run them as a pre deploy step instead, so a failed migration stops the deploy before traffic moves over.

**Migration policy for a mobile product.** Old app versions stay installed for months and you cannot force everyone to update. Use expand and contract: add the new column, teach the code to write both, ship, and only remove the old column several releases later. A destructive migration breaks every user who has not updated.

### Health check

```ts
// presentation/health/health.controller.ts
import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { DB, type Database } from '@infrastructure/db';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    @Inject(DB) private readonly db: Database,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => {
        const check = this.indicator.check('database');
        try {
          await this.db.execute(sql`select 1`);
          return check.up();
        } catch (e) {
          return check.down({ message: (e as Error).message });
        }
      },
    ]);
  }
}
```

Verify both directions. A health check that always returns 200 is worse than none, because the platform will route traffic to a broken container:

```bash
curl localhost:3000/health          # {"status":"ok",...}
docker compose stop db
curl localhost:3000/health          # 503, status "error"
```

The health controller lives in `presentation` even though it is an operational concern. Keeping one rule ("HTTP endpoints live in presentation") is worth more than the theoretical purity of putting it elsewhere, because exceptions are what make people disable the boundary linter.

### Path aliases

`apps/api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2023",
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "strict": true,
    "strictPropertyInitialization": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "paths": {
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"],
      "@presentation/*": ["src/presentation/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`experimentalDecorators` and `emitDecoratorMetadata` are mandatory. Nest dependency injection does not work without them. The Nest CLI resolves the path aliases on its own, no extra config needed.

### Boundary linting

`apps/api/eslint.config.mjs`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  { ignores: ['dist/**', 'drizzle/**', 'eslint.config.mjs', 'src/migrate.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      'boundaries/include': ['src/**/*.ts'],
      'boundaries/elements': [
        { type: 'domain',         pattern: 'src/domain/*',         capture: ['feature'] },
        { type: 'application',    pattern: 'src/application/*',    capture: ['feature'] },
        { type: 'infrastructure', pattern: 'src/infrastructure/*', capture: ['feature'] },
        { type: 'presentation',   pattern: 'src/presentation/*',   capture: ['feature'] },
        { type: 'root',           pattern: 'src/*.ts',             mode: 'file' },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown': 'error',

      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'domain',
              allow: [
                ['domain', { feature: '${from.feature}' }],
                ['domain', { feature: 'shared' }],
              ],
            },
            {
              from: 'application',
              allow: [
                ['application', { feature: '${from.feature}' }],
                ['application', { feature: 'shared' }],
                ['domain', { feature: '${from.feature}' }],
                ['domain', { feature: 'shared' }],
              ],
            },
            { from: 'infrastructure', allow: ['infrastructure', 'application', 'domain'] },
            { from: 'presentation',   allow: ['presentation', 'infrastructure', 'application', 'domain'] },
            { from: 'root',           allow: ['root', 'presentation', 'infrastructure'] },
          ],
        },
      ],

      'boundaries/external': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: ['domain'],
              disallow: ['@nestjs/*', 'drizzle-orm', 'pg', 'zod', 'express', 'rxjs', 'reflect-metadata'],
              message: 'Domain must not depend on external libraries',
            },
            {
              from: ['application'],
              disallow: ['@nestjs/config', 'drizzle-orm', 'pg', 'express', '@nestjs/terminus'],
              message: 'Application must not know about infrastructure',
            },
          ],
        },
      ],
    },
  },
);
```

The plugin is pinned to version 6. Version 7 changed the config shape significantly (`boundaries/dependencies` with `policies`, object based selectors, `{{...}}` templates). Migrating is mechanical but not urgent, and v6 still works with deprecation warnings.

`eslint-import-resolver-typescript` is required. Without it ESLint cannot resolve `.ts` extensions and every local import gets reported as an unknown dependency.

Because the layers sit at the top level, the folder structure does not stop `domain/auth` from importing `domain/orders`. The `${from.feature}` templates are what enforce that, so do not remove them.

**Test that the rules actually fire.** A green run proves nothing on its own:

```bash
mkdir -p apps/api/src/domain/shared apps/api/src/domain/orders apps/api/src/domain/auth

cat > apps/api/src/domain/shared/probe.ts <<'EOF'
import { Injectable } from '@nestjs/common';

@Injectable()
export class Probe {
  greet(name: string): string {
    return `hello ${name}`;
  }
}
EOF

cat > apps/api/src/domain/auth/probe.ts <<'EOF'
export const AUTH_PROBE = 'auth';
EOF

cat > apps/api/src/domain/orders/probe.ts <<'EOF'
import { AUTH_PROBE } from '../auth/probe';

export function fromAuth(): string {
  return AUTH_PROBE;
}
EOF

pnpm --filter @app/api lint
```

You should get exactly two errors: one for the external import in the domain, one for the cross feature import. Then delete the probe files.

### Backend scripts

```json
{
  "dev":              "nest start --watch",
  "build":            "nest build",
  "start":            "node dist/main",
  "typecheck":        "tsc -p tsconfig.json --noEmit",
  "lint":             "eslint src",
  "test":             "echo skip",
  "db:generate":      "drizzle-kit generate",
  "db:migrate":       "drizzle-kit migrate",
  "db:migrate:prod":  "node dist/migrate",
  "db:studio":        "drizzle-kit studio"
}
```

Also add `"files": ["dist", "drizzle"]` to `apps/api/package.json`. Without `drizzle` in that list, `pnpm deploy` will not copy the migration SQL into the production image.

---

## Mobile

### Architecture: Feature Sliced Design

Clean architecture does not transfer well to a React Native client. There is very little real domain logic to protect, and React actively fights the separation: `useQuery` is data access and presentation at the same time, and splitting it produces wrappers that add nothing.

FSD solves the same problem (boundaries, direction of dependencies, public APIs) in terms that fit React.

```
apps/mobile/
  app/                    Expo Router routes, thin
    _layout.tsx
    index.tsx
    (auth)/
      _layout.tsx
      login.tsx
    (tabs)/
      _layout.tsx
      index.tsx
      profile.tsx

  src/
    features/             user scenarios
      auth/
        api/
        model/
        ui/
        index.ts          public API, the only thing others may import
    entities/             business entities shared by several features
      user/
        model/
        ui/
        index.ts
    shared/
      api/                http client, interceptors
      ui/                 Button, Text, Sheet
      lib/                helpers, hooks
      config/             env
```

Layers from top to bottom: `app`, `features`, `entities`, `shared`. Each layer may import from the layers below it and from itself, never upward, and never sideways into a sibling slice.

Start with this reduced set. Add `widgets` and `pages` when screens grow large enough to need them, and add `entities` when something like `User` is genuinely needed by two features, not before.

Three rules to keep:

1. A file in `app/` composes, it does not fetch or hold business logic. Aim for 30 to 50 lines.
2. Features talk to each other only through `index.ts`.
3. Imports never go upward.

### Where does pure logic go

If you have calculations or rules that do not depend on React (pricing, business validation, domain formatting), put them in `packages/core` as plain TypeScript with unit tests. That is the one place where ports and layers earn their keep, and both apps can use it.

Everything else in the mobile app is UI and network orchestration, and extra abstraction only slows it down.

### Expo Router

```bash
pnpm --filter @app/mobile add expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants
```

In `apps/mobile/package.json`:

```json
"main": "expo-router/entry"
```

Delete the old `index.ts` and `App.tsx` from the mobile root, Router does not use them.

**Keep the `app/` folder at the mobile root**, not inside `src/`. Configuring a custom root with `plugins: [['expo-router', { root: './src/app' }]]` works in a normal project but breaks in a hoisted pnpm monorepo: `expo-router` gets resolved from the repo root, the Babel plugin does not transform it, and `EXPO_ROUTER_APP_ROOT` ends up undefined. The error looks like this:

```
Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT
First argument of `require.context` should be a string denoting the directory to require.
```

FSD is not harmed by this. `app` is still its own layer, it just sits one level up.

Root layout:

```tsx
// app/_layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
```

Parentheses in folder names like `(auth)` and `(tabs)` create route groups. The folder gives its children a shared layout but does not appear in the URL, so login and the main app can have different shells without an extra path segment.

### Build variants

Three variants with different bundle identifiers, so all three can be installed on one device at the same time.

```ts
// apps/mobile/app.config.ts
import type { ExpoConfig } from 'expo/config';

type Variant = 'development' | 'staging' | 'production';

const variant = (process.env.APP_VARIANT ?? 'development') as Variant;

const variants = {
  development: {
    name: 'Assuredd Dev',
    bundleId: 'com.assuredd.app.dev',
    apiUrl: 'http://localhost:3000',
  },
  staging: {
    name: 'Assuredd Staging',
    bundleId: 'com.assuredd.app.staging',
    apiUrl: 'https://api-staging.assuredd.com',
  },
  production: {
    name: 'Assuredd',
    bundleId: 'com.assuredd.app',
    apiUrl: 'https://api.assuredd.com',
  },
} as const;

const current = variants[variant];

const config: ExpoConfig = {
  name: current.name,
  slug: 'assuredd-mobile',
  scheme: 'assuredd',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: current.bundleId,
    supportsTablet: false,
  },
  android: {
    package: current.bundleId,
  },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: current.apiUrl,
    variant,
  },
};

export default config;
```

Notes:

- `scheme` is required for the dev client to open links from the dev server.
- Do not add `newArchEnabled`. Since SDK 55 the New Architecture is always on and cannot be turned off, so the field was removed from the types.
- Delete `app.json` if it still exists. With both files present Expo merges them and `app.json` wins on some fields, which makes debugging confusing.
- `userInterfaceStyle` on Android needs `expo-system-ui` installed.

Reading the values at runtime:

```ts
// src/shared/config/env.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = { apiUrl: string; variant: string };

const extra = Constants.expoConfig?.extra as Extra | undefined;

if (!extra?.apiUrl) {
  throw new Error('apiUrl is missing from app.config.ts extra');
}

function resolveDevHost(url: string): string {
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2');
  }
  return url;
}

export const API_URL = resolveDevHost(extra.apiUrl);
export const APP_VARIANT = extra.variant;
export const IS_DEV = extra.variant === 'development';
```

`localhost` works on the iOS simulator but not on the Android emulator, where the host machine is reachable at `10.0.2.2`. That is what `resolveDevHost` handles.

Values go through `extra` rather than `EXPO_PUBLIC_*` because `extra` is computed in the config and read at runtime, so there is only one mechanism to keep in sync instead of two.

### eas.json

```json
{
  "cli": { "version": ">= 5.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "APP_VARIANT": "development" },
      "ios": { "simulator": true }
    },
    "staging": {
      "distribution": "internal",
      "env": { "APP_VARIANT": "staging" },
      "channel": "staging"
    },
    "production": {
      "env": { "APP_VARIANT": "production" },
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

`channel` ties a build to an EAS Update channel. Without it, over the air updates go to every build regardless of variant.

The `ios.simulator: true` option in the development profile means you do not need a paid Apple Developer account to test on the simulator.

### API layer

```ts
// src/shared/api/http.ts
import type { z } from 'zod';
import { API_URL } from '../config/env';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  init?: RequestInit,
): Promise<z.infer<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, body?.message ?? 'Request failed');
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Response does not match the contract: ${parsed.error.issues[0].message}`);
  }

  return parsed.data;
}
```

The `schema.safeParse(body)` line is the important one. If the backend returns something the contract did not promise, you find out immediately with a clear message instead of three screens later as `undefined is not an object`.

### State management

Split it strictly:

- Anything that comes from the server lives in TanStack Query and nowhere else.
- Client state (UI, drafts, filters) lives in Zustand.

The most common mistake in React Native projects is putting server data into a global store and then hand syncing it.

Forms use react-hook-form with `zodResolver` and the same schemas from `@app/contracts`.

### Metro config

```js
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
```

`watchFolders` is what makes hot reload pick up changes in `packages/contracts`. If edits there stop appearing in the app, check that this file still has it. Prebuild sometimes overwrites it.

### Mobile boundary linting

```js
// apps/mobile/eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  { ignores: ['ios/**', 'android/**', '.expo/**', 'node_modules/**', 'eslint.config.mjs', 'app.config.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      'boundaries/include': ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
      'boundaries/elements': [
        { type: 'app',      pattern: 'app',            mode: 'folder' },
        { type: 'features', pattern: 'src/features/*', capture: ['slice'] },
        { type: 'entities', pattern: 'src/entities/*', capture: ['slice'] },
        { type: 'shared',   pattern: 'src/shared/*',   capture: ['segment'] },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'app',      allow: ['app', 'features', 'entities', 'shared'] },
            { from: 'features', allow: [['features', { slice: '${from.slice}' }], 'entities', 'shared'] },
            { from: 'entities', allow: [['entities', { slice: '${from.slice}' }], 'shared'] },
            { from: 'shared',   allow: ['shared'] },
          ],
        },
      ],
    },
  },
);
```

Four rules cover the whole model: `app` sees everyone, `features` sees `entities`, `shared` and itself, `entities` sees `shared` and itself, `shared` sees only itself.

Verify it the same way as on the backend:

```bash
cd apps/mobile
mkdir -p src/shared/lib src/features/auth

cat > src/features/auth/probe.ts <<'EOF'
export const AUTH = 'auth';
EOF

cat > src/shared/lib/probe.ts <<'EOF'
import { AUTH } from '../../features/auth/probe';
export const value = AUTH;
EOF

pnpm lint
```

You should get one error about `shared` depending on `features`. That is the most important FSD rule: the bottom layer knows nothing about the layers above it. Delete the probes afterwards.

The public API rule (import `features/auth`, never `features/auth/model/store`) is not covered by this config. It needs the separate `boundaries/entry-point` rule, which is worth adding once there is a real feature to test it against.

### Mobile tsconfig

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

Metro in Expo resolves these aliases without extra configuration.

Keep the TypeScript version aligned across all packages. Different major versions in one workspace cause confusing type errors.

### Running the app

Use a development build, not Expo Go. Expo Go is a prebuilt app from the App Store with a fixed set of native modules; you cannot add anything to it and it only supports the latest SDK. A development build is the same experience but compiled from your project, with your native modules and your SDK. Same `expo start`, same fast refresh, same Expo Router.

This is not plain React Native. It is still Expo, just not Expo Go.

```bash
cd apps/mobile

pnpm prebuild:dev        # APP_VARIANT=development expo prebuild --clean
pnpm ios                 # or pnpm android
```

The first native build takes 15 to 30 minutes. After that, `pnpm start` is enough for day to day work. You only need to rebuild when you add a native dependency or upgrade the SDK.

Do not commit `ios/` and `android/`. They are generated by prebuild. Add to `.gitignore`:

```
apps/mobile/ios/
apps/mobile/android/
```

Native changes belong in config plugins, not in edited native files. Otherwise every SDK upgrade turns into an archaeology project.

### Mobile scripts

```json
{
  "start":            "expo start",
  "ios":              "expo run:ios",
  "android":          "expo run:android",
  "prebuild:dev":     "APP_VARIANT=development expo prebuild --clean",
  "prebuild:staging": "APP_VARIANT=staging expo prebuild --clean",
  "prebuild:prod":    "APP_VARIANT=production expo prebuild --clean",
  "typecheck":        "tsc --noEmit",
  "lint":             "eslint app src",
  "build":            "echo skip",
  "test":             "echo skip"
}
```

---

## Docker

Docker packages the backend. It is not a development environment.

For local work, run Nest on the host with `pnpm dev` and keep only Postgres in a container. You get fast reload and a working debugger. Use the image when you want to verify what will actually ship.

### Dockerfile

Lives in the **repository root**, not in `apps/api`. The build context has to include `packages/`, otherwise the shared package cannot be copied.

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json            apps/api/
COPY packages/contracts/package.json  packages/contracts/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/contracts packages/contracts
COPY apps/api          apps/api
RUN pnpm --filter @app/api... build
RUN pnpm --filter @app/api --prod deploy --legacy /out

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
```

Why each piece is there:

- `.npmrc` is copied on purpose. It holds `node-linker=hoisted`, and without it the install inside the image differs from the local one.
- The `package.json` files are copied separately from the sources so the `pnpm install` layer stays cached until dependencies actually change. This saves minutes on every build.
- The three dots in `--filter @app/api...` mean "this package and everything it depends on", so contracts gets built first.
- `pnpm deploy` produces an isolated folder with the app and its production dependencies, with workspace packages physically injected. `--legacy` avoids needing `inject-workspace-packages=true`. Build must run before deploy.
- `USER node` matters. Containers run as root by default and that is the first thing any audit flags.

### .dockerignore

Also in the repository root:

```
**/node_modules
apps/mobile
**/dist
.git
.turbo
**/.env
```

`apps/mobile` keeps the mobile project out of the build context. `**/.env` keeps local secrets out of the image.

Check the context size after a build:

```bash
docker compose build api --progress=plain 2>&1 | grep -i "transferring context"
```

It should be a few megabytes, not hundreds.

### docker-compose.yml

```yaml
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5436:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://postgres:postgres@db:5432/app
    ports:
      - "3550:3000"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

Port mapping is `host:container`. The right hand number must be the port the process actually listens on inside the container. Postgres always listens on 5432 inside its image, and the API listens on whatever `PORT` says. The host side can be anything free.

`DATABASE_URL` inside compose uses `db:5432`, the service name on the internal network. Host port mappings are irrelevant there.

For local development against the containerised database, `apps/api/.env` should point at the host port:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5436/app
```

### Entrypoint scripts

If you want one, keep migrations out of it:

```sh
#!/bin/sh
set -e
exec node dist/main
```

`exec` is not optional. Without it `SIGTERM` goes to the shell instead of Node, and `enableShutdownHooks` never runs, so the Postgres pool is never closed.

### Commands

```bash
docker compose build api
docker compose up -d
docker compose ps
docker compose logs api --tail 50

curl localhost:3550/health

docker compose run --rm api node dist/migrate
```

Always run these from the repository root. Running `docker compose build` from `apps/api` gives you `"/apps/api" not found` because the context becomes the wrong directory.

---

## CI

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ github.sha }}
          restore-keys: turbo-

      - run: pnpm turbo typecheck lint test build
```

Step order matters: `pnpm/action-setup` must come before `setup-node`, otherwise `cache: pnpm` cannot find the package manager. The pnpm version comes from the `packageManager` field in the root `package.json`, so there is no need to specify it twice.

The real value here is that Turborepo type checks the whole repo. Change a zod schema in `packages/contracts` and the mobile build fails if it is not ready for the new contract. That is the entire reason for the monorepo.

Enable branch protection on `main` (Settings, Branches, Require status checks to pass) and select the `check` job.

**Verify the gate works.** Rename a field in the contracts without touching the controller and push. CI must fail on `typecheck` in `@app/api`. A green run proves nothing by itself.

---

## Deployment

### Railway (current)

Railway's own GitHub integration does the deploying. GitHub Actions is the gate, not the deployer.

Service settings:

- **Root Directory**: `/`. Do not set it to `/apps/api`. This is a shared monorepo, the API imports `packages/contracts`, and pointing at the app folder alone breaks the build on `workspace:*`.
- **Builder**: Dockerfile. Do not use the automatic monorepo detection or Railpack. You already know you are moving to DigitalOcean, and platform specific build commands would have to be rebuilt there.
- **Watch paths**: `apps/api/**`, `packages/**`, `pnpm-lock.yaml`. Without these, every mobile commit redeploys the backend.
- **Pre-deploy command**: `/bin/sh -c 'node dist/migrate'`.

`railway.toml` in the repository root:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
preDeployCommand = "/bin/sh -c 'node dist/migrate'"
```

Pre-deploy runs between the build and the release, inside the private network and with the service environment variables available. If it fails, the deploy does not go through, which is exactly what you want.

Three pre-deploy gotchas:

- Anything you call must exist in the production image. `drizzle-kit` is a dev dependency, which is why there is a separate `migrate.ts` compiled into `dist`.
- With a Dockerfile build, wrap shell syntax: `/bin/sh -c "..."`. `&&` is shell syntax, not exec form.
- The pre-deploy container has no access to volumes. Anything the migration reads must be baked into the image.

Environments: create `staging` and `production`, each with its own Postgres. `develop` deploys to staging, `main` to production. Link variables with references like `${{Postgres.DATABASE_URL}}` instead of copying connection strings by hand.

**Pricing reality check.** The free plan gives one dollar of non rolling credit per month, which covers roughly one tiny always on service and no database. A Nest app plus Postgres does not fit. Budget for Hobby at five dollars per month minimum, realistically five to fifteen with a database and a staging environment.

### DigitalOcean (later)

Because the build is a Dockerfile, moving is mostly a matter of pointing a different platform at the same image. App Platform builds from a Dockerfile; a Droplet runs the same image through `docker compose`.

What does not move automatically:

- **The database.** Railway's Postgres is their managed service, not part of your image. Migration means `pg_dump` and `pg_restore` with a maintenance window. Keep `DATABASE_URL` as the only connection point and avoid vendor specific extensions.
- **The migration hook.** Railway has a pre-deploy command, a Droplet does not. That is why migrations are a plain npm script, so each platform can call it its own way.
- **Reference variables.** `${{Postgres.DATABASE_URL}}` is Railway syntax. The zod env validator means the app does not care where the values come from.
- **Private networking.** Railway's internal network is not a DigitalOcean VPC. When Redis or a worker appears, the wiring gets rewritten.
- **Observability.** Platform logs and metrics do not migrate. Set up Sentry and your own `/health` early and do not treat the platform dashboard as the source of truth.

Rough costs: Droplet from four dollars, the common 2 GB tier around twelve, App Platform from five per component, managed Postgres from fifteen. New accounts get two hundred dollars of credit for sixty days.

The cheap path is a twelve dollar Droplet with Postgres in Docker next to the app and Caddy for TLS, all under `docker compose`. The Railway-like path is App Platform plus managed Postgres, around twenty to twenty five dollars, with no SSH into the container and no persistent volumes.

**The rule that keeps migration cheap:** no vendor SDKs in the code, everything platform specific goes through environment variables. Then moving is `docker compose up`, restore the dump, change DNS.

---

## Conventions

### General

- Node 22, pnpm from `packageManager`, one TypeScript version across the workspace.
- Commit `pnpm-lock.yaml`, `drizzle/`, `.env.example`.
- Never commit `.env`, `.env.local`, `ios/`, `android/`, `node_modules/`, `dist/`, `.turbo/`.
- Run `pnpm turbo typecheck lint` before pushing.

### Contracts

- Schemas are the single source of truth for API shapes.
- Nothing server specific or React specific goes into `packages/contracts`.
- Rebuild after every change, or keep `tsc -w` running.

### Backend

- Domain has zero external imports.
- Ports are interfaces plus a Symbol token, bound to implementations in the Nest module.
- Config reaches use cases as narrow typed ports, never as `ConfigService`.
- HTTP endpoints live in `presentation`, always.
- Migrations run as a pre-deploy step, never from the start command.
- Schema changes follow expand and contract because old mobile clients stay in the wild for months.

### Mobile

- Route files compose only.
- Server data lives in TanStack Query, client state in Zustand, no overlap.
- Features are imported through `index.ts` only.
- No upward imports between layers.
- Development builds, not Expo Go.
- Native changes go through config plugins, not edited native files.

---

## Troubleshooting

These are all real problems hit while setting this repo up.

### `nest new` crashes with ERR_REQUIRE_CYCLE_MODULE

The Nest CLI pulls `@angular-devkit/schematics`, which calls `require()` on `ora` 9, an ESM only package. Node 22 fails on the circular import.

This only affects the `nest new` schematic. Local `nest build` and `nest start` are fine. Scaffold the app manually instead; for a monorepo that is better anyway because you get exactly the files you need.

### Unable to resolve "expo-modules-core"

Classic pnpm plus React Native. `expo-modules-core` is a transitive dependency hidden in pnpm's isolated store, and Metro does not follow those symlinks.

Fix: `node-linker=hoisted` in the root `.npmrc`, then a full reinstall (delete all `node_modules` and the lockfile) and `expo start --clear`.

### zod.defaultErrorMap is not a function

`nestjs-zod` below version 5 patches zod through `defaultErrorMap`, an API that no longer exists in zod 4. The first `safeParse` after the patch blows up, which usually means the env validator.

Fix: upgrade `nestjs-zod` to 5 or later and remove `@nest-zod/z`, which is a zod 3 fork from older versions. Pin one zod version across the workspace with `pnpm.overrides`, otherwise contracts, api and mobile will drift and schemas will be parsed by a foreign zod instance.

### eslint-plugin-boundaries reports every local import as unknown

Missing TypeScript resolver. ESLint cannot resolve extensionless `.ts` imports on its own, so the plugin classifies them as unknown dependencies.

Fix: install `eslint-import-resolver-typescript` and add the `import/resolver` setting.

### "/apps/api" not found during docker build

You ran `docker compose build` from `apps/api`. The context becomes that folder and `COPY apps/api ...` looks for `apps/api/apps/api`.

Fix: run from the repository root, and make sure `build.context` in `docker-compose.yml` is `.`, not `./apps/api`. Check with `docker compose config`, which prints the resolved absolute path.

### transferring dockerfile: 2B

The Dockerfile is empty or missing at the resolved path. Check with `wc -c Dockerfile`. If the build still succeeds it is only because every layer came from cache; the next clean build will fail.

### Port already in use

Ports 5432 and 3000 are the usual suspects: a native Postgres installed on macOS, or your own `pnpm dev` still running.

Find the holder with `sudo lsof -nP -iTCP:5432 -sTCP:LISTEN`. Without `sudo` you will not see processes owned by other users, including the `postgres` user.

The clean fix is to move the host side ports rather than kill the other process: `5436:5432` and `3550:3000`. Update `apps/api/.env` to match. Do not change the container side.

If your `.env` points at `localhost` and a native Postgres is also running, it is very easy to talk to the wrong database. When you see "table does not exist" on a healthy connection, check the port first.

### Swift tools version 6.2.0 but the installed version is 6.0.0

Xcode is too old. React Native 0.86 needs Xcode 26. Cache clearing will not help.

```bash
xcodebuild -version
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

### Symbol not found: _XPCTypeBool

A conflict between a new Xcode and leftover old Command Line Tools.

```bash
sudo rm -rf /Library/Developer/CommandLineTools
sudo xcode-select --install
sudo xcodebuild -runFirstLaunch
xcodebuild -find clang
```

A reboot is sometimes required after a major Xcode upgrade, because some system frameworks are replaced and not picked up immediately.

### Unable to install the CocoaPods CLI

Two causes. Either `gem install` without sudo cannot write to the system Ruby, or the Ruby version is too new. CocoaPods 1.17 and its dependencies do not work on Ruby 4.

```bash
brew install ruby@3.3
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
gem install cocoapods --no-document
```

Pin the version for the team with `apps/mobile/.ruby-version` if you use rbenv.

### iOS 26.x is not installed

Xcode 26 does not ship the simulator SDK. Download it:

```bash
xcodebuild -downloadPlatform iOS
xcrun simctl list devices available
```

Then run with `expo run:ios --device` to pick a simulator explicitly, because Expo may reuse a saved ID from an older Xcode.

### No Android connected device found

No emulator is running. Create one in Android Studio (More Actions, Virtual Device Manager, Create Device), pick Pixel 8 with an API 36 image, start it, and confirm with `adb devices`.

If `adb` itself is missing, the SDK was never downloaded. Open Android Studio and finish the setup wizard.

### Invalid call: process.env.EXPO_ROUTER_APP_ROOT

Router got `undefined` instead of a directory path. In a hoisted pnpm monorepo this happens when you configure a custom `root` for the `expo-router` plugin: the package resolves from the repo root, outside the reach of the Babel transform that sets the variable.

Fix: keep `app/` at the mobile project root and use `plugins: ['expo-router']` without options.

### newArchEnabled does not exist in type ExpoConfig

Since SDK 55 the New Architecture is always enabled and the flag was removed. Delete the line.

The practical consequence is that every native library must support the New Architecture. Check on reactnative.directory before adding one.

### Changes in packages/contracts do not show up in the app

Contracts are compiled. Metro watches `dist`, which only changes when tsc runs.

Fix: run `pnpm dev` from the root so `tsc -w` stays running, and confirm `metro.config.js` still has `watchFolders = [workspaceRoot]`. Prebuild sometimes overwrites that file.

### Fast Refresh loses state

Expected. Fast Refresh preserves state only for component files. Editing a non component module remounts the tree. This is a limitation of the mechanism, not a configuration problem.
