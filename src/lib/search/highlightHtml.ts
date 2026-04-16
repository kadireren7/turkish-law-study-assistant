/**
 * Basit vurgu: metin içinde madde kalıpları için <mark> (XSS için önce escape).
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Madde / m. referanslarını vurgular. */
export function highlightLawReferencesHtml(text: string): string {
  const esc = escapeHtml(text)
  return esc.replace(
    /(\b(?:m\.|madde)\s*\d+(?:\s*[–-]\s*[^\n<]{0,80})?)/gi,
    '<mark class="bg-amber-100 dark:bg-amber-900/40 rounded px-0.5">$1</mark>'
  )
}
