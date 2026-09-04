"use client";

import Link from "next/link";
import { useState } from "react";
import type { Media, Prompt } from "@/lib/catalog/types";

function SourceMedia({ media, primary }: { media: Media; primary: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`ph ${primary ? "p45" : ""}`}><span className="media-fallback">This source media is unavailable.</span></div>;
  return <div className={`ph ${primary ? "p45" : ""}`}>
    {media.kind === "video" ? <video controls playsInline preload="none" poster={media.poster ?? undefined} src={media.src} width={media.width ?? 720} height={media.height ?? 900} aria-label={media.alt || "Video from the original post"} onError={() => setFailed(true)} /> : <img src={media.src} alt={media.alt} loading={primary ? "eager" : "lazy"} fetchPriority={primary ? "high" : "auto"} width={media.width ?? 720} height={media.height ?? 900} referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
  </div>;
}

export function RecipeMedia({ prompt }: { prompt: Prompt }) {
  const media: Media[] = prompt.media.length ? prompt.media : prompt.img ? [{ id: `${prompt.id}-preview`, kind: "image", src: prompt.img, alt: `Result from ${prompt.title}`, width: null, height: null, poster: null, label: null }] : [];
  const primary = media[0];
  if (!primary) return <div className="nomedia">
    <b>No image was published with this prompt</b>
    <p>The author posted the words on their own. Showing a picture made by something else would credit the wrong render.</p>
    <Link className="btn" href={`/${prompt.locale}/prompts/image`}>Browse prompts that have results →</Link>
  </div>;
  return <div className="shots">
    <SourceMedia key={primary.id} media={primary} primary />
    {media.length > 1 && <div className="strip">{media.slice(1, 4).map((item) => <SourceMedia key={item.id} media={item} primary={false} />)}</div>}
    <p className="eyebrow" style={{ marginTop: 2 }}>{prompt.kind === "video" ? "VIDEO" : "PHOTO"}{media.length > 1 && ` · ${media.length} from the post`}</p>
  </div>;
}
