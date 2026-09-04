"use client";

import { useState } from 'react';
import type { Prompt } from '@/lib/catalog/types';

export function PromptMedia({ prompt, width = 560, height = 560, className, priority = false }: {
  prompt: Prompt; width?: number; height?: number; className?: string; priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const video = prompt.media.find(media => media.kind === 'video');
  if (failed || !prompt.img && !video) return <span className={`media-fallback ${className ?? ''}`}>
    <span>{failed ? 'This source image is unavailable.' : 'No image on the source post.'}</span>
  </span>;
  if (video) return <video className={className} src={video.src} poster={video.poster ?? prompt.img ?? undefined} controls playsInline preload="none" width={width} height={height} onError={() => setFailed(true)} aria-label={video.alt || prompt.title} />;
  // The static export preserves the reference media crop and does not require an image server.
  return <img className={className} src={prompt.img ?? ''} alt={prompt.media[0]?.alt || `A result of the prompt “${prompt.title}”`} width={width} height={height} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
