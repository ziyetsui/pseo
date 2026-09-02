/**
 * `sizes` for every slot a `MediaFrame` is rendered in.
 *
 * `srcSet` alone is not enough: without `sizes` the browser assumes the image
 * fills the viewport and downloads the widest candidate for a 340px rail card.
 * These values describe the slot's REAL rendered width at each breakpoint —
 * they follow the same grids the layouts declare, so a change to a grid must
 * change the matching entry here.
 *
 * Deliberately a plain module, not part of `MediaFrame`: that file is
 * `"use client"`, and a server component importing a value from a client
 * module gets a client reference rather than the string.
 */
export const MEDIA_SIZES = {
  /** L1 本期精选 — one of two columns inside the 1200px shell. */
  featured: "(min-width: 1024px) 560px, 92vw",
  /** Card grids: three across on desktop, two on tablet, one on mobile. */
  cardGrid: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  /** Horizontal rails: fixed-width cards (`w-80` / `md:w-96`). */
  rail: "(min-width: 1024px) 340px, 80vw",
  /** L4 hero, the right-hand column of the detail header. */
  detailHero: "(min-width: 1024px) 620px, 92vw",
  /** L4 thumbnail strip: three across a narrow column, never large. */
  detailThumbnail: "160px",
} as const;
