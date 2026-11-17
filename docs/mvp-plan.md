# MVP implementation plan

## Goal

Prove one thing on a pilot: if couriers mark obstacles and the route avoids them, they spend less time on the last 300 meters. Anything that does not help prove this is out of the MVP.

## Scope

### In the MVP

**Courier app**

- Route to the door: enter an address or pick a house on the map. If the house has a known entrance, the route leads to it, not to the building center. The walking route is drawn on the map with distance and time.
- Obstacles on the map: active obstacles shown as icons with type, comment and time added. Search by visible map area, radius around an address, filter by type.
- Add an obstacle in 2-3 taps: type, place (point plus radius or a small area), optional comment and photo.
- Confirm or remove an obstacle: "still relevant" and "no longer relevant". Without this the map fills with stale obstacles within weeks and couriers stop trusting it.
- Route rebuild: a new obstacle on the path rebuilds the route and shows "route changed: arch closed". The app polls every 20-30 seconds and on screen open. This is simpler and more reliable than a live connection on bad networks.
- Bad connectivity: an obstacle added offline is stored on the phone and sent later without duplicates.
- Background tracking: no own algorithm in the MVP, but tracks are collected from day one. They are the raw material for the future graph and the main source of pilot numbers. To save battery and reduce courier concern, a track is recorded only near the delivery address.

**Server (API)**

- Courier auth, binding to a client (tenant).
- Obstacles: create, search by area, confirm, remove, auto-expiry.
- Routes: build with obstacles, check whether the current route is still valid.
- Known house entrances.
- Track intake in batches.
- Idempotency keys for everything that comes from the phone.
- Address search (geocoder) from day one.

**Minimal admin** (internal, for our team, not for the client): create clients and couriers, list obstacles with delete for mistakes, export pilot numbers. A simple web page or Retool, not a separate product.

### Out of the MVP

- Own routing algorithm and graph built from tracks.
- Intercom codes (needs TMS integration and separate protection).
- TMS integration: the courier enters the address manually.
- SDK for client apps: only our app is used in the pilot.
- Offline maps and offline routing.
- Automatic obstacle detection from tracks.
- Client dashboard with analytics.

## Two kinds of obstacles

They are technically different and are separated from the start:

- **Obstacle** (closed arch, incident): the route avoids it. Stored as a geometry in PostGIS.
- **Alternate entrance**: nothing to avoid, the destination point changes. The route is built to the correct entrance. Stored as knowledge about a house.

Lifetime:

| Kind | Lifetime |
| --- | --- |
| Incident | Expires automatically, 24 hours by default, extended by "still relevant" |
| Closed arch | Until removed, or until N "no longer relevant" marks from different couriers (N in config, start with 3) |
| Alternate entrance | Permanent |

## Routing without our own algorithm

The server calls an external router through a `RouteProvider` interface and passes active obstacles near the route as avoid zones. Later our C++ algorithm takes the same place and the apps notice nothing.

**Valhalla**, self-hosted on OpenStreetMap data, is the recommended provider:

- pedestrian mode that accounts for sidewalks, paths and stairs;
- accepts avoid zones as arbitrary polygons (`exclude_polygons`), not only rectangles;
- free, and runs on the same OSM data planned for weekly updates;
- one more Docker container next to the API.

TomTom is the alternative if running our own service is unwanted. Downsides: avoid zones are rectangles only, per-request billing, and whether avoiding zones works in pedestrian mode must be tested before relying on it.

Any external router knows streets but not courtyards, arches or entrances. The MVP's value therefore rests on obstacles and known entrances, not on in-courtyard accuracy. That gap is what our algorithm closes later.

**Address search** uses TomTom Search or Photon on OSM data, behind a `Geocoder` interface.

## Decisions

1. **PostGIS.** The database image moves from `postgres:17-alpine` to `imresamu/postgis:17-3.5-alpine` (same Alpine base, so the existing data volume stays compatible). `imresamu/postgis` is the community multi-arch build of the official PostGIS image; `postgis/postgis` has no arm64 Alpine build, which breaks Apple Silicon machines.
2. **Router.** Valhalla behind `RouteProvider`.
3. **Map.** Stay on Mapbox (`@rnmapbox/maps`) for the MVP since offline maps are out of scope. The move to MapLibre and PMTiles is deferred.
4. **Geocoder.** Photon (OSM) behind a `Geocoder` interface, public server for development and a self-hosted one later. TomTom Search is the drop-in alternative if a key is available.
5. **Multi-tenancy.** `tenant_id` on every domain table from the start. Row-level security can follow, the column cannot be added late.
6. **Admin.** Retool or plain SQL views over the database, no custom frontend.
7. **"Reached the door".** The headline metric (time from arriving at the house to the door) cannot be derived from GPS alone. It needs an explicit "I am at the door" action or automatic detection by proximity to the entrance. To be agreed with the product owner before stage 5.

## Stages

### Stage 0. Foundation (about 3-4 days)

- [x] PostGIS in docker compose, extension enabled by migration.
- [x] `tenants` table; `users` get `tenant_id` and `role`; tenant and role carried in the access token.
- [x] Valhalla container in docker compose (behind the `routing` profile, with an OSM extract of the pilot city).
  - Verified locally: a pedestrian route is built, and `exclude_polygons` placed on the route line changes the route; a zone covering the endpoints returns "No path could be found" (HTTP 400), which stage 2 must map to an explicit "no detour" answer.
  - The default extract is Lviv oblast (including Lviv city). Valhalla keeps tiles in the `valhalla` volume and ignores a new `tile_urls` once tiles exist (`use_tiles_ignore_pbf`); to switch area, remove only that volume first: `docker compose --profile routing rm -sf valhalla && docker volume rm assuredd-apps_valhalla` (never `down -v`, it also deletes the database volume).
- [x] Shared idempotency mechanism on the API (`Idempotency-Key` header, key table, interceptor).
- [x] Base shared types in `contracts`: geo primitives, obstacle kinds, idempotency header name.

### Stage 1. Obstacles, server (about 1 week)

Status: done except photo upload (deferred to stage 5, only the `photo_key` column exists). Endpoints: `POST/GET /obstacles`, `POST /obstacles/:id/votes`, `DELETE /obstacles/:id`, `POST/GET /entrances`, `DELETE /entrances/:id`. Rules: incident TTL 24 h (`INCIDENT_TTL_SEC`), extended by "still relevant"; `OBSTACLE_DISMISS_THRESHOLD` (default 3) "no longer relevant" marks from different couriers remove an obstacle of any kind; only the author or an admin can remove immediately; every query is scoped by `tenant_id`.

- `obstacles` (geometry, kind, comment, photo key, `expires_at`, status) and `entrances` (house or address, destination point).
- `confirmations` table, one mark per courier per obstacle.
- API: create, search (bbox, radius, kind filter), confirm, remove.
- Expiry: lazy (filter by `expires_at` in queries) plus a periodic cleanup job.
- Photos: upload to S3-compatible storage by presigned URL, only the key in the database. May move to stage 5 if S3 is not ready.

### Stage 2. Routes and address search, server (about 1 week)

Status: done. Endpoints: `POST /routes`, `POST /routes/check`, `GET /addresses/search`.

- Building: route without zones, then re-route with the obstacles the line crosses as `exclude_polygons`, repeating up to 4 passes because a detour can run into other obstacles. Obstacles that cover the start or the destination are returned in `warnings` and are not avoided (the courier has to reach the door).
- Destination: the nearest known entrance within 30 m of the address point, unless `useEntrance` is false.
- Check: the plan has a `version` (destination plus the set of avoided obstacle ids). `/routes/check` rebuilds and compares, so a moving courier gets no false changes; reasons are `obstacle_added`, `obstacle_removed`, `destination_changed`.
- Errors: `ROUTE_NOT_FOUND` 404, `ROUTE_BLOCKED` 422 (with `obstacleIds`), `ROUTE_TOO_LONG` 422 (over 15 km), `ROUTING_UNAVAILABLE` 503.
- Geocoder: Photon (`GEOCODER_URL`, default is the public dev server `photon.komoot.io`, not for production load). TomTom Search was the plan, but it needs an API key; the `Geocoder` port makes either one a one-class change.
- Valhalla's pedestrian costing prefers footways and penalizes some crossings, so a route is not always the shortest in meters, and a detour around an obstacle can even be shorter than the unconstrained route.

- `RouteProvider` interface in `domain`, `ValhallaRouteProvider` in `infrastructure`.
- Route building: active obstacles near the route line become `exclude_polygons`; a radius becomes a polygon.
- Destination: the known entrance if the house has one, otherwise the address.
- Validity check endpoint: the app sends a route id or a hash of the obstacle set; the server answers "unchanged" or a new route with the reason.
- Address search endpoint through `Geocoder`.
- Main risk: Valhalla does not know courtyards. Verify on real pilot addresses. If an avoid zone blocks the only path, answer "no detour" explicitly instead of returning an empty route.

### Stage 3. Mobile: routes and obstacles (about 1.5-2 weeks)

Status: implemented, not yet tried on a device (type check, lint and a full JS bundle build pass).

- Map screen (`app/(tabs)/index.tsx`) composes the features. Shared pieces live in `entities/obstacle` and `entities/route` because feature slices may not import each other.
- Obstacles: zones and tappable markers for the visible area (refreshed every 30 s, filter by type), a card with "still relevant" / "no longer relevant" and "remove" for the author. The area query is skipped when zoomed out past the server's 0.5 degree limit.
- Add flow: "+" then type, tap the place (radius 10/20/40 m), send; optional comment. The idempotency key is created when the flow starts and reused on retries.
- Route: address search through `/addresses/search`, or press and hold a house on the map; the route is drawn with distance and time; the app checks `/routes/check` every 25 s, when the app returns to the foreground and when the screen gets focus, and shows "route changed: ..." with the reason.
- The courier position is the device location, or the profile address when the device is outside Ukraine (the map only covers Ukraine).
- Not in this stage: photos, offline queue (stage 4).

Feature-Sliced layout:

- `features/route`: address input with suggestions, picking a house on the map, route line, distance and time.
- `features/obstacles`: map icons, search by visible area, type filter.
- `features/obstacle-create`: 2-3 tap flow (type, point and radius, send); comment and photo optional.
- Confirm / remove actions on the obstacle card.
- Rebuild: check every 20-30 seconds and on screen open (TanStack Query `refetchInterval`), with the "route changed" notification.

### Stage 4. Bad connectivity (about 3-4 days, after stage 3)

Status: implemented, not yet tried on a device (type check, lint, a full JS bundle build and unit tests of the queue logic pass).

- Storage: small JSON files in the app's documents folder through `expo-file-system` (already part of the native build, so no new native rebuild). SQLite or MMKV were not needed for a queue of a few entries.
- Writes (add, confirm, remove an obstacle) try the server first with an 8 s timeout. With no answer they go to a persisted queue (`entities/obstacle/model/offline-queue.store.ts`), tagged with the courier's id and the idempotency key created when the courier acted. The same key goes with every retry, so a request that reached the server but lost its reply is not applied twice.
- Sending (`use-offline-sync.ts`, mounted in the tabs layout): when the app opens, when it returns to the foreground, and every 15 s while something waits. Changes go out in order and stop at the first one that cannot be delivered; a change the server refuses for good (for example an invalid shape) is dropped and counted; a 404 on confirm/remove counts as done; a 401 keeps the queue.
- On screen: an offline-added obstacle is drawn faded on the map (tap it to cancel); a confirm or remove applies to the screen at once; a banner shows "N changes waiting" / "sending" / "N could not be saved".
- Reads: every fresh answer is remembered on disk (up to 400 obstacles); with no answer the map shows what was last seen for that area, filtered by type and expiry.
- Session fixes found on the way: opening the app offline no longer logs the courier out (the last profile is cached and tokens are only cleared when the server refuses them), and a failed refresh caused by no connection no longer wipes the tokens.
- Not covered: connectivity events (a native NetInfo module would need an app rebuild); retries are timer based. Photos are still out. A vote on an obstacle that is itself still queued is not possible (it can only be cancelled).

- Offline queue on the phone for creating and confirming obstacles (SQLite or MMKV).
- Every write gets its `Idempotency-Key` at creation time, so a retry after a dropped connection creates no duplicates.
- Reads: TanStack Query with a persisted cache so the latest obstacles are visible offline.

### Stage 5. Background tracking (about 1 week, can run in parallel with stage 3)

Status: implemented. The server side and the whole tracking pipeline (state, background task handler, sync, controller) are tested against the real API; the iOS/Android background behavior itself is not tried on a device, and needs a rebuild of the app (new native module and permissions).

**Server** (`POST /visits`, `GET /visits/:id`, `POST /visits/:id/events`, `POST /visits/:id/points`):
- `delivery_visits` (tenant, courier, destination point and label, status, start, arrival, door, finish) and `track_points` (visit, time, point, accuracy; unique per visit and time, so a point sent twice is stored once). The visit id is made on the phone, so starting a visit can be repeated and works offline.
- Events: `arrived_at_house` (the courier entered the zone within 300 m of the destination, set automatically), `reached_door` (explicit, ends the visit), `cancelled`. The first report of an event wins and a finished visit does not change, so repeats are harmless.
- Points go in batches of up to 200, with an idempotency key; points timestamped more than 5 minutes in the future are ignored. Only the courier's own visits are reachable.
- Raw points are deleted after `TRACK_RETENTION_DAYS` (default 30) by an hourly job; the visit rows stay.

**Mobile** (`features/tracking`):
- Start delivery (after a one-time consent), then the app asks for "always" location access and starts coarse updates (about every 50 m). On the first fix within 300 m it records the arrival and switches to precise updates (every few meters); fixes outside the zone or less accurate than 65 m are not kept. "I'm at the door" ends the visit and stops tracking.
- Everything is kept on disk first and sent when possible: the visit, events, then points in batches of 200 in order, stopping at the first failure and retrying every 20 s, on every new fix and when the app returns to the foreground. A visit forgotten for 12 hours is cancelled automatically.
- The task is registered at start-up from the root layout, so it also runs when the system relaunches the app in the background for a location. The task manager is loaded defensively: in a build made before it was added the app still starts and tracking reports "install the latest version".
- Decision still open with the product owner: "reached the door" is an explicit button. The time between entering the 300 m zone and that button is the measured number; automatic detection by distance to a known entrance can be added later.

**To try it: rebuild the app** (`expo-task-manager` is a new native module and the iOS `location` background mode and the "always" permission text are new). The first delivery also needs the "Always" permission; "While using" only records while the app is open.

- `expo-location` plus `expo-task-manager`; background permission (iOS `UIBackgroundModes: location` and usage strings, Android foreground service).
- Record only within a radius (300-500 m) of the delivery address. Mark "arrived at house" and "reached the door" as explicit events.
- Send in batches of points (time, coordinates, accuracy) with idempotency.
- Server: `tracks` table linked to tenant, courier and address, with a configurable retention period for raw data.

### Stage 6. Minimal admin (about 3-4 days)

- Create clients and couriers.
- Obstacle list with delete.
- Pilot numbers export (see below). SQL views first, Retool on top. Admin endpoints live in a separate module with a separate role.

### Stage 7. Pilot preparation (about 3-5 days)

- Deploy (Railway for now), database backups, error monitoring.
- Private app builds (TestFlight and an internal Android channel).
- Personal data policy for tracks: courier consent, retention period, access only within the client.
- Dry run on real addresses of the pilot district.

### Order

```
Stage 0 ──┬─ Stage 1 ──┬─ Stage 3 ── Stage 4
          │            │
          └─ Stage 2 ──┘
          └─ Stage 5 (track intake on the server can start right after stage 0)
                       Stage 6 ── Stage 7
```

Rough total: 6-7 weeks for one person, about 4 weeks for two (one on backend: 0, 1, 2; one on mobile: 3, then 5, 4). Estimates will firm up after Valhalla is checked on real courtyards.

## What to measure in the pilot

- Time from arriving at the house to the door, before and after adoption. This is the headline ROI number and can only be computed from tracks, which is why tracking is mandatory.
- Obstacles added, and how many were confirmed by other couriers.
- How often the route was rebuilt and saved time.
- Share of deliveries where the courier followed the route instead of their own way.
