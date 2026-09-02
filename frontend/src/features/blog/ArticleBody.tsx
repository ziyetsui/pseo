import { renderInlineMarkdown, type InlineToken } from "./inline-markdown";

function InlineTokens({ tokens }: { tokens: readonly InlineToken[] }) {
  return (
    <>
      {tokens.map((token, index) => {
        switch (token.type) {
          case "code":
            return (
              <code
                key={index}
                className="border-2 border-foreground bg-muted px-1 font-mono text-sm"
              >
                {token.value}
              </code>
            );
          case "strong":
            return <strong key={index}>{token.value}</strong>;
          case "link":
            return (
              <a
                key={index}
                href={token.href}
                target="_blank"
                rel="noopener nofollow"
                className="underline decoration-accent-blue decoration-2"
              >
                {token.value}
                <span className="sr-only">（外部链接，新窗口打开）</span>
              </a>
            );
          default:
            return <span key={index}>{token.value}</span>;
        }
      })}
    </>
  );
}

export interface ArticleBodyProps {
  paragraphs: readonly string[];
  className?: string;
}

/**
 * Article body: one `<p>` per stored paragraph, with the three inline
 * conventions mapped to real elements. No raw HTML is ever injected.
 */
export function ArticleBody({ paragraphs, className }: ArticleBodyProps) {
  return (
    <div data-article-body className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="mt-5 max-w-prose text-base leading-8 font-medium first:mt-0">
          <InlineTokens tokens={renderInlineMarkdown(paragraph)} />
        </p>
      ))}
    </div>
  );
}
