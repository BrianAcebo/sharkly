import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../utils/common';

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Markdown renderer for chat messages with proper styling
 * Supports: bold, italic, lists, tables, code, links
 */
export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Paragraphs - no extra margin for chat
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        
        // Bold text
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        
        // Links - style but don't make clickable (UI handles navigation)
        a: ({ children }) => (
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">{children}</span>
        ),
        
        // Unordered lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        
        // Ordered lists
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
        ),
        
        // List items
        li: ({ children }) => (
          <li className="text-sm">{children}</li>
        ),
        
        // Inline code
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <code
                className="block bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-xs overflow-x-auto my-2"
                {...props}
              >
                {children}
              </code>
            );
          }
          return (
            <code
              className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        
        // Code blocks
        pre: ({ children }) => (
          <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 overflow-x-auto my-2 text-xs">
            {children}
          </pre>
        ),
        
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border-collapse">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold border-b border-gray-200 dark:border-gray-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            {children}
          </td>
        ),
        
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-indigo-300 dark:border-indigo-600 pl-3 my-2 italic text-gray-600 dark:text-gray-400">
            {children}
          </blockquote>
        ),
        
        // Headings - keep them subtle in chat
        h1: ({ children }) => (
          <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
        ),
        
        // Horizontal rule
        hr: () => (
          <hr className="my-3 border-gray-200 dark:border-gray-700" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}

