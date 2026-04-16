/**
 * Canonical on-disk layout for legal knowledge, derived data, and pedagogy.
 * Legacy root `law-data/` was migrated to `data/` (see repo docs).
 */
import path from 'path'

export const PROJECT_ROOT = process.cwd()
export const DATA_ROOT = path.join(PROJECT_ROOT, 'data')

/** Core legislation (markdown). */
export const CORE_LAWS_DIR = path.join(DATA_ROOT, 'core', 'laws')
/** Article index JSON (Madde Ara). */
export const CORE_ARTICLE_INDEX_DIR = path.join(DATA_ROOT, 'core', 'article-index')
/** Topic / course notes (markdown). */
export const CORE_TOPICS_DIR = path.join(DATA_ROOT, 'core', 'topics')

/** Generated summaries, pipeline history, update-log. */
export const DERIVED_UPDATES_DIR = path.join(DATA_ROOT, 'derived', 'updates')
/** Law news JSON feeds. */
export const DERIVED_NEWS_DIR = path.join(DATA_ROOT, 'derived', 'news')
/** Optional coverage / audit artifacts. */
export const DERIVED_COVERAGE_DIR = path.join(DATA_ROOT, 'derived', 'coverage')

export const CASES_DECISION_SUMMARIES_DIR = path.join(DATA_ROOT, 'cases', 'decision-summaries')
export const CASES_PRACTICALS_DIR = path.join(DATA_ROOT, 'cases', 'practicals')

const PEDAGOGY_ROOT = path.join(DATA_ROOT, 'pedagogy')
export const PEDAGOGY_PATHS = {
  instructorProfiles: path.join(PEDAGOGY_ROOT, 'instructor-profiles'),
  examPatterns: path.join(PEDAGOGY_ROOT, 'exam-patterns'),
  rubrics: path.join(PEDAGOGY_ROOT, 'rubrics'),
  sampleAnswers: path.join(PEDAGOGY_ROOT, 'sample-answers'),
  studyNotes: path.join(PEDAGOGY_ROOT, 'study-notes'),
} as const

const IMPORTS_ROOT = path.join(DATA_ROOT, 'imports')
export const IMPORTS_PATHS = {
  raw: path.join(IMPORTS_ROOT, 'raw'),
  normalized: path.join(IMPORTS_ROOT, 'normalized'),
  manifests: path.join(IMPORTS_ROOT, 'manifests'),
} as const

/** Marker file written by `npm run daily:update`. */
export const LAST_FULL_UPDATE_PATH = path.join(DATA_ROOT, 'derived', 'last-full-update.json')

/** Roots scanned for markdown RAG chunks (excludes imports; pedagogy included when populated). */
export const RAG_MARKDOWN_ROOTS: string[] = [
  CORE_LAWS_DIR,
  CORE_TOPICS_DIR,
  DERIVED_UPDATES_DIR,
  CASES_DECISION_SUMMARIES_DIR,
  PEDAGOGY_PATHS.studyNotes,
  PEDAGOGY_PATHS.sampleAnswers,
]

/**
 * Normalize any stored relative path (legacy `law-data/...` or new `data/...`) to the
 * legacy *suffix* shape used in PATH_TO_LAW_NAME maps: `mevzuat/tck.md`, `guncellemeler/...`, etc.
 */
export function normalizeDataRelativePath(relativePath: string): string {
  let n = relativePath.replace(/\\/g, '/')
  if (n.startsWith('law-data/')) n = n.slice('law-data/'.length)
  else if (n.startsWith('data/')) n = n.slice('data/'.length)

  if (n.startsWith('core/laws/')) return 'mevzuat/' + n.slice('core/laws/'.length)
  if (n.startsWith('core/article-index/')) return 'madde-index/' + n.slice('core/article-index/'.length)
  if (n.startsWith('core/topics/')) return 'konu-notlari/' + n.slice('core/topics/'.length)
  if (n.startsWith('derived/updates/')) return 'guncellemeler/' + n.slice('derived/updates/'.length)
  if (n.startsWith('derived/news/')) return 'haberler/' + n.slice('derived/news/'.length)
  if (n.startsWith('cases/decision-summaries/')) return 'karar-ozetleri/' + n.slice('cases/decision-summaries/'.length)
  return n
}
