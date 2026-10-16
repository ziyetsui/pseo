"use client";
import { uiText, text } from '@/lib/i18n/text';
import type { Locale } from '@/lib/catalog/types';

import Link from "next/link";
import { useState } from "react";
import type { Media, Prompt } from "@/lib/catalog/types";

function SourceMedia({ media, primary, reference = false, intrinsic = false , uiLocale = 'en'}: { media: Media; primary: boolean; reference?: boolean; intrinsic?:boolean ; uiLocale?: Locale }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`ph ${primary ? "p45" : ""}`}><span className="media-fallback">{uiText(uiLocale, "This source media is unavailable.")}</span></div>;
  return <div className={`ph ${primary ? "p45" : ""}`} style={{position:"relative",...((intrinsic || reference && primary || media.kind === "video") && media.width && media.height ? { aspectRatio: `${media.width} / ${media.height}` } : {})}}>
    {media.label && <span style={{position:"absolute",top:8,left:8,zIndex:1,background:"var(--surface)",padding:"4px 8px"}}>{media.label}</span>}
    {media.kind === "video" ? <video style={{ objectFit: "contain" }} controls playsInline preload="none" poster={media.poster ?? undefined} src={media.src} width={media.width ?? 720} height={media.height ?? 900} aria-label={[media.label,media.alt || uiText(uiLocale, "Video from the original post")].filter(Boolean).join(" · ")} onError={() => setFailed(true)} /> : <img style={reference ? { objectFit: "contain" } : undefined} src={media.src} alt={media.alt} loading={primary ? "eager" : "lazy"} fetchPriority={primary ? "high" : "auto"} width={media.width ?? 720} height={media.height ?? 900} referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
  </div>;
}

export function RecipeMedia({ prompt, website = false , uiLocale = 'en'}: { prompt: Pick<Prompt,'id'|'title'|'img'|'media'|'reconstruction'|'locale'> ; website?:boolean; uiLocale?: Locale }) {
  const media: Media[] = prompt.media.length ? prompt.media : prompt.img ? [{ id: `${prompt.id}-preview`, kind: "image", src: prompt.img, alt: text(uiLocale, `Result from ${prompt.title}`, `${prompt.title}的生成结果`), width: null, height: null, poster: null, label: null }] : [];
  const primary = media[0];
  if (!primary) return <div className="nomedia">
    <b>{website ? text(uiLocale,"No visual preview supplied by the source","来源未提供视觉预览") : uiText(uiLocale, "No image was published with this prompt")}</b>
    <p>{website ? text(uiLocale,"Follow the original source for the author’s notes.","可通过原始来源查看作者的说明。") : uiText(uiLocale, "The author posted the words on their own. Showing a picture made by something else would credit the wrong render.")}</p>
    <Link className="btn" href={`/${prompt.locale}/prompts/${website ? "website" : "image"}`}>{website ? text(uiLocale,"Browse website cases →","浏览网站案例 →") : uiText(uiLocale, "Browse prompts that have results →")}</Link>
  </div>;
  return <div className="shots">
    <SourceMedia uiLocale={uiLocale} key={primary.id} media={primary} primary reference={prompt.reconstruction || website} intrinsic={website} />
    {media.length > 1 && <div className="strip">{media.slice(1, prompt.reconstruction || media.some(item=>item.label) ? undefined : 4).map((item) => <SourceMedia uiLocale={uiLocale} key={item.id} media={item} primary={false} reference={prompt.reconstruction || website} intrinsic={website} />)}</div>}
    <p className="eyebrow" style={{ marginTop: 2 }}>{primary.kind === "video" ? text(uiLocale, "VIDEO", "视频") : text(uiLocale, "PHOTO", "图片")}{media.some(item=>item.label) ? text(uiLocale,` · Complete video in ${media.length} ordered parts`,` · 完整视频，共 ${media.length} 段，按顺序观看`) : media.length > 1 && text(uiLocale, ` · ${media.length} from the post`, ` · 原帖中的 ${media.length} 个媒体`)}</p>
  </div>;
}
