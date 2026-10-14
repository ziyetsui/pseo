"use client";
import { uiText, text } from '@/lib/i18n/text';
import type { Locale } from '@/lib/catalog/types';

import Link from "next/link";
import { useState } from "react";
import type { Media, Prompt } from "@/lib/catalog/types";

function SourceMedia({ media, primary , uiLocale = 'en'}: { media: Media; primary: boolean ; uiLocale?: Locale }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`ph ${primary ? "p45" : ""}`}><span className="media-fallback">{uiText(uiLocale, "This source media is unavailable.")}</span></div>;
  return <div className={`ph ${primary ? "p45" : ""}`}>
    {media.kind === "video" ? <video controls playsInline preload="none" poster={media.poster ?? undefined} src={media.src} width={media.width ?? 720} height={media.height ?? 900} aria-label={media.alt || uiText(uiLocale, "Video from the original post")} onError={() => setFailed(true)} /> : <img src={media.src} alt={media.alt} loading={primary ? "eager" : "lazy"} fetchPriority={primary ? "high" : "auto"} width={media.width ?? 720} height={media.height ?? 900} referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
  </div>;
}

export function RecipeMedia({ prompt , uiLocale = 'en'}: { prompt: Prompt ; uiLocale?: Locale }) {
  const media: Media[] = prompt.media.length ? prompt.media : prompt.img ? [{ id: `${prompt.id}-preview`, kind: "image", src: prompt.img, alt: text(uiLocale, `Result from ${prompt.title}`, `${prompt.title}的生成结果`), width: null, height: null, poster: null, label: null }] : [];
  const primary = media[0];
  if (!primary) return <div className="nomedia">
    <b>{uiText(uiLocale, "No image was published with this prompt")}</b>
    <p>{uiText(uiLocale, "The author posted the words on their own. Showing a picture made by something else would credit the wrong render.")}</p>
    <Link className="btn" href={`/${prompt.locale}/prompts/image`}>{uiText(uiLocale, "Browse prompts that have results →")}</Link>
  </div>;
  return <div className="shots">
    <SourceMedia uiLocale={uiLocale} key={primary.id} media={primary} primary />
    {media.length > 1 && <div className="strip">{media.slice(1, 4).map((item) => <SourceMedia uiLocale={uiLocale} key={item.id} media={item} primary={false} />)}</div>}
    <p className="eyebrow" style={{ marginTop: 2 }}>{prompt.kind === "video" ? text(uiLocale, "VIDEO", "视频") : text(uiLocale, "PHOTO", "图片")}{media.length > 1 && text(uiLocale, ` · ${media.length} from the post`, ` · 原帖中的 ${media.length} 个媒体`)}</p>
  </div>;
}
