"use client";

import { useState } from "react";

import { cx } from "./class-names";

import { GeometricMark } from "./GeometricMark";

export interface MediaFrameProps {
  src: string;
  /**
   * Same picture at several widths (`… 680w, … 1200w, … 2048w`). `null` when
   * the host publishes no size ladder — the browser then just uses `src`.
   */
  srcSet?: string | null;
  /**
   * How wide this frame actually renders, per breakpoint, so the browser can
   * choose from `srcSet` before layout exists. Meaningless without `srcSet`.
   */
  sizes?: string;
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
 *
 * The picture is `object-contain` on the `bg-muted` mat, NOT `object-cover`.
 * These images are the prompt's own result: the box ratio comes from the
 * caller (a fixed 16:9 placeholder in this phase, since the source posts
 * publish no intrinsic dimensions), while the real outputs are largely
 * portrait, and cropping them to fill the box beheads the subject and shows
 * something the prompt did not produce — misrepresenting a result, which the
 * root `AGENTS.md` §3 forbids. The prototype's own CSS says `object-fit:
 * cover`; that is a style-layer choice, and this is the owner-directed
 * deviation from it. The mat is therefore visible around a portrait frame by
 * design, and is drawn in the design system's own muted token so it reads as
 * a mat rather than as a gap.
 */
export function MediaFrame({
  src,
  srcSet,
  sizes,
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
          srcSet={srcSet ?? undefined}
          sizes={srcSet === null || srcSet === undefined ? undefined : sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={cx("h-full w-full object-contain", imgClassName)}
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
