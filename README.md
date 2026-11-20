# Skunky platform · SkunkScrape public application

This repository is the **public application** entrypoint of the [Skunky platform organization](https://github.com/skunky-bot). SkunkScrape remains the existing lead discovery product; Skunky is the umbrella service architecture.

**Canonical architecture:** [ADR-0001](docs/architecture/ADR-0001-skunky-platform.md) · **Integration test:** [.github/workflows/skunky-integration.yml](.github/workflows/skunky-integration.yml).

The Next.js console includes a [Web Collector](#web-collector) for one-time and recurring scans. GitHub Pages publishes the static marketing site. Run the console, API and worker on a runtime that supports long-lived processes.

The legacy `backend/` FastAPI/Celery/Redis/PostgreSQL stack is preserved for a controlled transition, not silently replaced. Cloud deployment choice remains undecided.

## Web Collector

Open `/collector` in the Next.js console and sign in with a SkunkScrape operator account. Enter keywords, a source limit, and the country code used to interpret local phone numbers. **One-time scan** runs once. **Continuous** runs immediately and repeats at the selected interval. Pausing retains existing contacts and resuming schedules an immediate scan. Contacts are deduplicated per collection and include the URL where they were first seen.

For a local run, check out `skunky-bot/www`, `skunky-bot/api`, `skunky-bot/search`, `skunky-bot/scan` and `skunky-bot/collect` into sibling directories. Set `SKUNKY_JWT_SECRET`, `SKUNKY_ADMIN_USERNAME`, `SKUNKY_ADMIN_PASSWORD`, `SKUNKY_ADMIN_EMAIL` and `SKUNKY_SERVICE_TOKEN` in your local environment. Point `SKUNKY_SOURCE_REGISTRY_FILE` at an absolute path to a reviewed registry. The [API documentation](https://github.com/skunky-bot/api#web-collector) shows the source entry format.

From the `www` repository:

```bash
export SKUNKY_COLLECTOR_ENABLED=true
docker compose -f infra/docker-compose.skunky-preview.yml --profile collector up --build -d
cd frontend
npm install
NEXT_PUBLIC_SKUNKY_API_BASE_URL=http://127.0.0.1:8001 npm run dev
```

Open `http://localhost:3000/collector`. The API and one worker share the SQLite volume `skunky-state`. The bundled registry has a preview fixture, so configure reviewed entries before starting live scans. Keep the API and worker running for unattended collection.

---

# SkunkScrape

SkunkScrape is a non-Firebase web console and plugin-driven scraping toolkit for Skunkworks.
It combines a production-lean web platform direction with modular scraping, contact discovery,
and future SaaS automation workflows.

## Platform Scope

SkunkScrape currently covers two aligned tracks:

- **Web Console**: a production-lean non-Firebase platform direction for dashboard, orchestration, and operator workflows
- **Scraping Toolkit**: a plugin-based Python architecture for crawling, contact discovery, exports, and automation

## Current Implemented Components

- Root CLI orchestrator: `main.py`
- Plugin package: `skunkscrape.plugins`
- Plugin manifest: `skunkscrape/plugins/manifest.json`
- Working crawler: `smart_contact_crawler`
- Test suite under `tests/`
- Structured logs under `data/logs/`
- Structured outputs under `data/output/`

## Project Structure

```ASCII
SKUNKSCRAPE/
|-- backend/
|   `-- app/
|       `-- main.py
|-- data/
|   |-- logs/
|   `-- output/
|       `-- smart_contact_crawler/
|-- skunkscrape/
|   |-- __init__.py
|   `-- plugins/
|       |-- __init__.py
|       |-- manifest.json
|       `-- smart_contact_crawler.py
|-- tests/
|   |-- test_main.py
|   |-- test_manifest.py
|   `-- test_smart_contact_crawler.py
|-- main.py
|-- pyproject.toml
`-- README.md
```
