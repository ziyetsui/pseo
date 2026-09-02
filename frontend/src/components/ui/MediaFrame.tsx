"use client";

import { useState } from "react";

import { cx } from "./class-names";

import { GeometricMark } from "./GeometricMark";

export interface MediaFrameProps {
  src: string;
  /** Real description of the media. Kept reachable even after a load failure. */
  alt: string;
  width: number;
  height: number;
  /** Above-the-fold media: eager + high fetch priority. Use sparingly. */
  priority?: boolean;
  /** Small overlay badge, e.g. `视频 14s`. */
  label?: string | null;
  className?: string;
  imgClassName?: string;
}

/**
 * The smallest possible client leaf: an `<img>` plus its failure state.
 *
 * A plain `<img>` (not `next/image`) is deliberate — the app is a static export
 * with `images.unoptimized: true`, so `next/image` would add a wrapper and a
 * runtime for zero optimisation. Width/height are always set so the layout
 * never shifts, and `referrerPolicy="no-referrer"` keeps our URLs out of the
 * third-party CDNs the prototype links to.
 */
export function MediaFrame({
  src,
  alt,
  width,
  height,
  priority = false,
  label,
  className,
  imgClassName,
}: MediaFrameProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cx(
        "relative flex items-center justify-center overflow-hidden border-b-2 border-foreground bg-muted md:border-b-4",
        className,
      )}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center">
          <span aria-hidden="true" className="flex items-center gap-2">
            <GeometricMark shape="circle" color="red" className="size-5" />
            <GeometricMark shape="square" color="blue" className="size-5" />
            <GeometricMark shape="triangle" color="yellow" className="size-5" />
          </span>
          <p className="text-sm font-bold">媒体不可用</p>
          <span className="sr-only">{alt}</span>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element --
           Static export with images.unoptimized: next/image adds markup and a
           runtime here without optimising anything. */
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cx("h-full w-full object-cover", imgClassName)}
        />
      )}

      {label === undefined || label === null || failed ? null : (
        <span className="absolute bottom-2 left-2 border-2 border-foreground bg-surface px-2 py-0.5 text-xs font-bold">
          {label}
        </span>
      )}
    </div>
  );
}
