/**
 * 챗봇 메시지 컴포넌트
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types/chatbot';

// 화살표 아이콘
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const hasSources = !isUser && message.sources && message.sources.length > 0;

  return (
    <div
      className={cn(
        'flex w-full mb-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-primary-500 text-white rounded-br-md'
            : 'bg-warm-100 text-primary-800 rounded-bl-md'
        )}
      >
        {/* 메시지 내용 */}
        {isUser ? (
          // 사용자 메시지: 단순 텍스트
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : (
          // AI 메시지: 마크다운 렌더링
          <div className="text-sm prose prose-sm prose-primary max-w-none break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // 코드 블록 스타일
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code
                      className="px-1 py-0.5 bg-warm-200 text-primary-700 rounded text-xs font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code
                      className={cn(
                        'block p-3 bg-warm-200 text-primary-700 rounded-lg text-xs font-mono overflow-x-auto',
                        className
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // pre 태그 스타일
                pre: ({ children }) => (
                  <pre className="my-2 p-0 bg-transparent overflow-x-auto">
                    {children}
                  </pre>
                ),
                // 링크 스타일
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-600 hover:text-accent-700 underline"
                  >
                    {children}
                  </a>
                ),
                // 리스트 스타일
                ul: ({ children }) => (
                  <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-sm">{children}</li>
                ),
                // 헤딩 스타일
                h1: ({ children }) => (
                  <h1 className="text-base font-bold mt-3 mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-bold mt-3 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                ),
                // 테이블 스타일
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto">
                    <table className="min-w-full text-xs border-collapse border border-warm-300">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="px-2 py-1 bg-warm-200 border border-warm-300 font-semibold text-left">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-2 py-1 border border-warm-300">{children}</td>
                ),
                // 인용문 스타일
                blockquote: ({ children }) => (
                  <blockquote className="my-2 pl-3 border-l-3 border-primary-300 text-primary-600 italic">
                    {children}
                  </blockquote>
                ),
                // 구분선
                hr: () => <hr className="my-3 border-warm-300" />,
                // 단락
                p: ({ children }) => <p className="my-1.5">{children}</p>,
                // 강조
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary-500 animate-pulse" />
            )}
          </div>
        )}

        {/* 출처 표시 (AI 메시지만) - 접기/펼치기 */}
        {hasSources && (
          <div className="mt-2 pt-2 border-t border-warm-300/50">
            <button
              type="button"
              onClick={() => setIsSourcesOpen(!isSourcesOpen)}
              className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 transition-colors"
            >
              <span>참조 ({message.sources!.length})</span>
              <ChevronDownIcon
                className={cn(
                  'transition-transform duration-200',
                  isSourcesOpen && 'rotate-180'
                )}
              />
            </button>
            {isSourcesOpen && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {message.sources!.map((source, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-1.5 py-0.5 bg-warm-200/50 rounded"
                  >
                    {source.startsWith('http') ? (
                      <a
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-600 hover:text-accent-700 hover:underline truncate max-w-[150px] inline-block"
                      >
                        {new URL(source).hostname}
                      </a>
                    ) : (
                      <span className="text-primary-600">{source}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
