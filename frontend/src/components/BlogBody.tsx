import { createElement, type ReactNode } from "react";
import { HTMLElement, TextNode, parse, type Node } from "node-html-parser";

const tags = new Set(["p", "strong", "em", "a", "img", "code", "pre", "blockquote", "ul", "ol", "li", "hr", "h2", "h3", "h4", "h5", "h6"]);
function url(value: string, image = false): string {
  if (!image && /^#[^\s\\]+$/.test(value)) return value;
  if (!/^(?:https:\/\/|\/(?!\/))[^\s\\]+$/.test(value)) throw new Error("Unsafe Article body URL");
  if (value.startsWith("https://")) { const target = new URL(value); if (target.username || target.password) throw new Error("Article body URL credentials"); }
  return value;
}
function renderNode(node: Node, key: number): ReactNode {
  if (node instanceof TextNode) return node.text;
  if (!(node instanceof HTMLElement)) return null;
  const tag = node.rawTagName.toLowerCase();
  if (!tags.has(tag)) throw new Error(`Unsupported Article body element: ${tag}`);
  const children = node.childNodes.map(renderNode);
  if (tag === "a") return <a key={key} href={url(node.getAttribute("href") ?? "")} rel="noopener noreferrer">{children}</a>;
  if (tag === "img") return <img key={key} src={url(node.getAttribute("src") ?? "", true)} alt={node.getAttribute("alt") ?? ""} loading="lazy" />;
  if (tag === "hr") return <hr key={key} />;
  const id = node.getAttribute("id");
  if (id && !/^[\p{Letter}\p{Number}_-]+$/u.test(id)) throw new Error("Unsafe Article heading ID");
  return createElement(tag, { key, ...(id ? { id } : {}) }, children);
}

/** The compiler has already rendered Markdown. Rebuild its allowlisted tree as React, never inject HTML. */
export function BlogBody({ html }: { html: string }) {
  return <div className="blog-body">{parse(html, { comment: false }).childNodes.map(renderNode)}</div>;
}
