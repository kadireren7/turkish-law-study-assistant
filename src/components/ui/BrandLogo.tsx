/** Küçük hukuk / çalışma markası — sidebar ve mobil başlıkta kullanılır. */
export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="32" height="32" rx="8" className="fill-slate-900 dark:fill-slate-100" />
      <path
        d="M8 22V10h2.5v12H8zm4.5-14h2.5v14H12.5V8zm5 0H20v14h-2.5V8zm5 0h2.5v14H22.5V8z"
        className="fill-teal-400 dark:fill-teal-700"
      />
      <path d="M6 24h20v2H6v-2z" className="fill-slate-400 dark:fill-slate-500" />
    </svg>
  )
}
