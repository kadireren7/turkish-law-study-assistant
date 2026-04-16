# Scripts

| Folder | Role |
|--------|------|
| `ingest/` | Fetch or pull external data (RSS, mevzuat.gov.tr, news feeds). |
| `transform/` | Normalize, sync indexes, legal update pipelines. |
| `jobs/` | Orchestrated pipelines (e.g. full daily update). |
| `audit/` | Coverage and consistency checks against `data/core`. |
| `runners/` | OS-specific launchers (e.g. Windows batch). |

Outputs are written under `data/` (see `data/README.md`).
