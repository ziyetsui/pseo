import { Children, isValidElement, type ReactNode } from 'react';
import type { Locale } from '@/lib/catalog/types';
import { text } from '@/lib/i18n/text';

/** Preserve every index link in server HTML while keeping the initial directory short. */
export function CompactIndex({ children, uiLocale, label, className = '', id, heading, list = 'ol', listClassName = '' }: {
  children: ReactNode; uiLocale: Locale; label: string; className?: string; id?: string;
  heading?: ReactNode; list?: 'ol' | 'div'; listClassName?: string;
}) {
  const items = Children.toArray(children), limit = 12;
  const identity = items.map((item, index) => isValidElement(item) ? item.key ?? index : index).join('|');
  const renderItems = (rows: ReactNode[], rest = false) => list === 'ol'
    ? <ol className={`${rest ? 'index-rest' : 'index-preview'} ${listClassName}`} start={rest ? limit + 1 : undefined}>{rows}</ol>
    : <div className={`${rest ? 'index-rest' : 'index-preview'} ${listClassName}`}>{rows}</div>;
  return <nav className={`compact-index ${className}`} id={id} aria-label={label}>
    {heading}{renderItems(items.slice(0, limit))}
    {items.length > limit && <details className="index-more" key={identity}>
      <summary><span className="index-open">{text(uiLocale, `Show all ${items.length} entries`, `查看全部 ${items.length} 项`)}</span><span className="index-close">{text(uiLocale, 'Show fewer entries', '收起更多条目')}</span></summary>
      {renderItems(items.slice(limit), true)}
    </details>}
  </nav>;
}
