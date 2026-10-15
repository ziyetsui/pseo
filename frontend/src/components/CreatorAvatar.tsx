"use client";
import { useState } from 'react';
import '@/styles/creator-avatar.css';

export function CreatorAvatar({ handle, src, size = 34 }: { handle: string; src?: string | null; size?: number }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const initials = handle.replace(/^@/, '').replace(/[_\s]+/g, '').slice(0, 2).toUpperCase() || '?';
  return <span className="av creator-avatar" style={{ width: size, height: size }} aria-hidden="true">
    <span className="creator-avatar-initials">{initials}</span>
    {src && src !== failedSource && <img src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedSource(src)} />}
  </span>;
}
