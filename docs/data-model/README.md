# Data model

Canonical layout lives in `data/`:

- **core/** — Laws, article index JSON, topic notes.
- **derived/** — Generated updates, news JSON, coverage artifacts.
- **cases/** — Decision summaries and practicals.
- **pedagogy/** — Instructor profiles, exam patterns, rubrics, samples, study notes (optional).
- **imports/** — Raw/normalized ingest staging.

See `src/lib/config/data-paths.ts` for path constants used by the app.
