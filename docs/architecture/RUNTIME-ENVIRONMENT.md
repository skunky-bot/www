# Skunky runtime and environment configuration

**Status:** PROVISIONAL — pending ADR-0002 (hosting and deployment selection).  
**Last reviewed:** 2026-11-20  
**Authority:** [ADR-0001](ADR-0001-skunky-platform.md) defines service boundaries but explicitly defers hosting. No accepted ADR-0002 is present in this repository as of this review. This document is an inventory and proposed runtime contract, **not** an approved production deployment decision.

## Canonical responsibilities

| Surface / service | Repository / current implementation | Runtime boundary |
| --- | --- | --- |
| Static public marketing | `www/index.html`, `.github/workflows/pages.yml` | **GitHub Pages only**. Deploys `index.html`, `CNAME` and optional static assets. No Next.js server, API, worker, or secret processing. |
| Interactive application | `www/frontend` | Next.js 15 standalone Node.js runtime (or equivalent compatible host), **not Pages**. `/collector` and `/pipeline` are application routes. |
| Canonical control plane target | `api` | FastAPI authenticated API, job/collection orchestration and policy enforcement; expose only through an approved TLS gateway. |
| Internal processing | `search`, `scan`, `collect` | Private, authenticated service endpoints. No direct browser access. |
| Source policy authority | `sources/registry/sources.v1.json` | Versioned, reviewed registry. Current `example.com` fixture is development-only; signed publication is pending. |
| Optional collection worker | `api/app/services/collector_worker.py` | Separate background process. **Disabled by default** pending independent network-fetch and privacy review. |
| Legacy runtime | `www/backend`, `studio` | Preserve existing FastAPI/Celery/PostgreSQL/Redis and Python/Tk tools until a migration ADR, parity tests and rollback approval. |
| Conversational client | `chat` | Current rule-based static preview; future model calls and secrets must remain server-side. |
| Outbound integrations | `skunkscrape-integrations` | Currently payload preparation only; no outbound transmission without explicit approval and policy checks. |

## Runtime decision pending ADR-0002

Compare the existing Docker/Next.js/FastAPI/PostgreSQL/Redis/Celery stack against a cloud-native Cloud Run/Tasks/Pub/Sub/Firestore design, with a single selected production data store, migration plan, cost model, tenancy, regional data handling, security, monitoring and rollback. Do **not** infer that a local Docker preview, GitHub Pages deployment, or green CI authorizes production collection.

Until that decision, the reproducible **local/staging preview** is the only documented Skunky integration runtime. Its internal services run on a private Compose network, while API is bound to localhost. The `collector` Compose profile is opt-in and must remain off for fixture-only staging.

## Environment inventory

| Variable | Consumed by | Purpose / safety |
| --- | --- | --- |
| `SKUNKY_JWT_SECRET` | Compose → API `SECRET_KEY` | Strong, unique signing key, managed secret; never reuse CI examples. |
| `SKUNKY_ADMIN_USERNAME`, `SKUNKY_ADMIN_PASSWORD`, `SKUNKY_ADMIN_EMAIL` | Compose → API bootstrap | Development operator bootstrap only; replace with SSO/role-aware identity before production. |
| `SKUNKY_SERVICE_TOKEN` | API + Search/Scan/Collect | Internal authentication secret; never set `NEXT_PUBLIC_*`. Prefer workload identity/mTLS for production. |
| `SKUNKY_SEARCH_URL`, `SKUNKY_SCAN_URL`, `SKUNKY_COLLECT_URL` | API/worker | Private service URLs. Compose uses `http://search:8000`, `http://scan:8000`, `http://collect:8000` on isolated network. Production requires authenticated encrypted service communication. |
| `SKUNKY_SOURCE_REGISTRY_FILE` | Compose bind mount | Absolute path to reviewed read-only registry JSON. Do not substitute an unreviewed live source list. |
| `SKUNKY_SOURCE_REGISTRY_PATH` | Search | Container path `/registry/sources.json`. |
| `SKUNKY_COLLECTOR_ENABLED` | API and worker | **false by default**. Enabling is prohibited until independent fetcher, egress and POPIA gates are approved. |
| `DATABASE_URL` | API/worker | Local preview uses persistent SQLite at `sqlite:////var/lib/skunky/skunky-preview.db`. Not suitable as a shared multi-instance production database. |
| `NEXT_PUBLIC_SKUNKY_API_BASE_URL` | Next.js collector/preview | Browser-reachable TLS API gateway URL; not a secret. Local example `http://127.0.0.1:8001`. |
| `NEXT_PUBLIC_ENABLE_SKUNKY_PREVIEW` | Next.js preview | Set `true` only in authenticated, explicitly authorized preview environments. |
| `NEXT_PUBLIC_API_BASE_URL` | Legacy Next.js jobs API helper | Currently defaults to `http://localhost:8000/api/v1`; reconcile or remove as part of API migration. |
| `POSTGRES_*`, `REDIS_PASSWORD`, `REDIS_URL`, `BACKEND_CORS_ORIGINS` | Legacy `www/docker-compose.yml` | Legacy-only values until ADR-0002 selects/migrates the stack; do not confuse with the Skunky preview configuration. |

### Environment profiles

| Profile | Frontend | API/data | Worker | Allowed data |
| --- | --- | --- | --- | --- |
| Local dev | `next dev` | Compose preview API + SQLite | Off | Synthetic fixture HTML only |
| CI | Build + integration test | Ephemeral Compose stack | Off | Synthetic fixture HTML only; assert `network_fetched=false`, `persisted=false`, `outreach_allowed=false` |
| Staging | Managed Next.js runtime **TBD by ADR-0002** | Private services, managed secrets and database **TBD** | Off until approved pilot | Approved fixture data; no real contacts by default |
| Production | **TBD by ADR-0002** | **TBD** | **Blocked until explicit security/privacy approval** | Only source/purpose/tenant-approved processing |

## Local preview startup

Clone `www`, `api`, `search`, `scan`, and `collect` as sibling directories. Supply unique credentials in an untracked local environment, including `SKUNKY_JWT_SECRET`, `SKUNKY_ADMIN_USERNAME`, `SKUNKY_ADMIN_PASSWORD`, `SKUNKY_ADMIN_EMAIL`, `SKUNKY_SERVICE_TOKEN`, and a fixture-only `SKUNKY_SOURCE_REGISTRY_FILE`.

From `www`:

```bash
export SKUNKY_COLLECTOR_ENABLED=false
docker compose -f infra/docker-compose.skunky-preview.yml up --build -d
cd frontend
npm install
NEXT_PUBLIC_SKUNKY_API_BASE_URL=http://127.0.0.1:8001 NEXT_PUBLIC_ENABLE_SKUNKY_PREVIEW=true npm run dev
```

Open `http://localhost:3000/pipeline` or `/collector`. `/collector` creation is disabled when the worker feature is off; use `/pipeline` for fixture-only extraction. **Do not enable the collector profile merely to test the UI.** For Windows PowerShell use `$env:NAME='value'` instead of `export`.

## Pages contract (must remain static)

`.github/workflows/pages.yml` builds `_site` from root static files and deploys with `actions/deploy-pages`. Do not copy `frontend/`, `backend/`, environment files, Docker artifacts, private API responses, contact data or build secrets into `_site`. Keep the public marketing site's links to interactive application routes disabled or directed to a separately verified staging/production URL.

Next.js `frontend/next.config.ts` uses `output: "standalone"`; this is a server runtime, not a GitHub Pages static export. DNS and TLS for the interactive console must be explicitly approved and documented in ADR-0002 before public launch.

## Verification and rollback

1. Verify Pages workflow artifact contains only expected static marketing files; root marketing page remains accessible.
2. Start preview without `--profile collector`; verify `GET /healthz`, authenticated `POST /pipeline/preview` and fixture email extraction.
3. Assert preview response has `network_fetched=false`, `persisted=false`, and `result.outreach_allowed=false`. Reject any synthetic lead presented as real.
4. Verify private Search/Scan/Collect ports are not exposed to the host/public Internet and requests without service authentication fail.
5. Verify frontend route availability, sign-in and sign-out, disabled collection controls, responsive layouts and error states.
6. For deployment rollback, restore the prior tagged frontend/API artifacts and registry version; retain database backup and reversible migrations. Pages rollback is redeploy of the last known-good static artifact. No production rollback procedure is approved until ADR-0002 defines hosting.

## Required follow-up before calling this canonical production runtime

- [ ] Approve ADR-0002 with provider, topology, database, queue, region, network, secrets, domains, deployment and rollback decisions.
- [ ] Replace bootstrap login/manual bearer-token preview with unified session/SSO.
- [ ] Resolve legacy vs canonical API base URLs and job contracts.
- [ ] Define tenant, purpose, source rights, DNC, retention and deletion enforcement before persistence.
- [ ] Independently approve any live fetcher and collection worker; maintain feature gate.
- [ ] Record staging smoke-test results and operational owners.

Related: [www #1](https://github.com/skunky-bot/www/issues/1), [www #5](https://github.com/skunky-bot/www/issues/5), [www #8](https://github.com/skunky-bot/www/issues/8), [api #4](https://github.com/skunky-bot/api/issues/4).
