interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm ${
          isUser ? 'bg-slate-200 text-slate-600' : 'bg-teal-100 text-teal-600'
        }`}
      >
        {isUser ? '👤' : '⚖️'}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-teal-600 text-white rounded-tr-md'
            : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-md'
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
