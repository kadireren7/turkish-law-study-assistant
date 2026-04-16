interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  /** Sohbet: sade balonlar; diğer sayfalar: varsayılan avatarlı görünüm */
  variant?: 'default' | 'minimal'
}

export function ChatMessage({ role, content, variant = 'default' }: ChatMessageProps) {
  const isUser = role === 'user'

  if (variant === 'minimal') {
    return (
      <div className={`flex w-full animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
            isUser
              ? 'bg-slate-800 text-slate-50 dark:bg-slate-700 dark:text-slate-100'
              : 'bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose-law whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatResponse(content) }} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm transition-colors ${
          isUser
            ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200'
            : 'bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-500/25 dark:to-emerald-500/25 text-teal-600 dark:text-teal-300'
        }`}
      >
        {isUser ? '👤' : '⚖️'}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
          isUser
            ? 'bg-teal-600 dark:bg-teal-500 text-white rounded-tr-md'
            : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-md'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <div
            className="prose-law text-sm whitespace-pre-wrap leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatResponse(content) }}
          />
        )}
      </div>
    </div>
  )
}

function formatResponse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')
}
