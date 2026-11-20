# Skunky platform · SkunkScrape public application

This repository is the **public application** entrypoint of the [Skunky platform organization](https://github.com/skunky-bot). SkunkScrape remains the existing lead discovery product; Skunky is the umbrella service architecture.

**Canonical architecture:** [ADR-0001](docs/architecture/ADR-0001-skunky-platform.md) · **Integration test:** [.github/workflows/skunky-integration.yml](.github/workflows/skunky-integration.yml).

Current status: the separately built `frontend/` Next.js console and sibling `api/search/scan/collect` services have a tested **development preview** path. The GitHub Pages deployment only publishes the root `index.html` static site; it does **not** publish the Next.js dashboard or deploy the new API/worker containers. Live crawling, production persistence, CRM export and public authentication rollout remain separate release gates.

The legacy `backend/` FastAPI/Celery/Redis/PostgreSQL stack is preserved for a controlled transition, not silently replaced. Cloud deployment choice remains undecided.

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
