import { createElement, type ReactNode } from 'react';

function safeHref(value: string, sourceUrl: string): string | undefined {
  if (/^#[^\s]+$/.test(value)) return value;
  if (/^(?:javascript|data|vbscript|file):/i.test(value) || /[\s\\]/.test(value)) return undefined;
  try {
    const base = new URL(sourceUrl, 'https://skills.invalid');
    const target = new URL(value, base);
    if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) return undefined;
    return target.origin === 'https://skills.invalid' ? target.pathname + target.search + target.hash : target.href;
  } catch { return undefined; }
}

function inline(text: string, sourceUrl: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) {
      const href = safeHref(link[2] ?? '', sourceUrl);
      return href ? <a key={index} href={href}>{link[1]}</a> : part;
    }
    return part;
  });
}

/** Render documented Markdown as inert React elements; embedded HTML is never executed. */
export function SkillsMarkdown({ markdown, sourceUrl }: { markdown: string; sourceUrl: string }) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const at = (index: number) => lines[index] ?? '';
  const nodes: ReactNode[] = [];
  let i = 0;
  // The original, including frontmatter, remains available in the source disclosure.
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end !== -1) i = end + 1;
  }
  while (i < lines.length) {
    const line = at(i);
    if (!line.trim()) { i++; continue; }
    const key = i;
    const fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !at(i).trim().startsWith((fence[1] ?? '```'))) body.push(at(i++));
      if (i < lines.length) i++;
      nodes.push(<pre key={key} tabIndex={0}><code>{body.join('\n')}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      // A document title follows the page H1 as H2, preserving one H1 per page.
      nodes.push(createElement(`h${Math.min((heading[1] ?? '#').length + 1, 6)}`, { key }, inline(heading[2] ?? '', sourceUrl)));
      i++; continue;
    }
    if (/^\s*[-*_]{3,}\s*$/.test(line)) { nodes.push(<hr key={key} />); i++; continue; }
    if (line.trim().startsWith('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) {
      const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
      const headings = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && at(i).trim().startsWith('|')) rows.push(cells(at(i++)));
      nodes.push(<div className="skills-table-scroll" key={key} tabIndex={0} role="region" aria-label="Skill reference table"><table><thead><tr>{headings.map((cell, j) => <th key={j} scope="col">{inline(cell, sourceUrl)}</th>)}</tr></thead><tbody>{rows.map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k}>{inline(cell, sourceUrl)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(at(i))) quote.push(at(i++).replace(/^\s*>\s?/, ''));
      nodes.push(<blockquote key={key}>{inline(quote.join('\n'), sourceUrl)}</blockquote>);
      continue;
    }
    if (/^\s*(?:[-+*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: ReactNode[] = [];
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-+*]\s+/;
      while (i < lines.length && pattern.test(at(i))) {
        items.push(<li key={i}>{inline(at(i++).replace(pattern, ''), sourceUrl)}</li>);
      }
      const start = ordered ? Number(line.match(/^\s*(\d+)/)?.[1] ?? 1) : undefined;
      nodes.push(ordered ? <ol key={key} start={start}>{items}</ol> : <ul key={key}>{items}</ul>);
      continue;
    }
    const paragraph: string[] = [line];
    i++;
    while (i < lines.length && at(i).trim() && !/^\s*(?:#{1,6}\s|`{3,}|~{3,}|>|[-+*]\s|\d+\.\s|\|)/.test(at(i))) paragraph.push(at(i++));
    nodes.push(<p key={key}>{inline(paragraph.join('\n'), sourceUrl)}</p>);
  }
  return <div className="skills-markdown" lang="zh-CN">{nodes}</div>;
}
