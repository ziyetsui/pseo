import { cx } from "./class-names";

/**
 * Identity slots: "who made this" in the smallest possible space.
 *
 * ## Why a monogram and not a brand logo
 *
 * The reference design puts each vendor's own SVG logo inside the square. We
 * deliberately do not. Those marks are other companies' trademarks; shipping
 * them would mean redistributing third-party brand assets we have no licence
 * to, from a site that is not theirs, in a static export we cannot revoke. A
 * monogram derived from the name we already display is the honest equivalent:
 * it identifies the same thing, it is generated from data we hold, and it can
 * never misrepresent a brand's own mark. **Do not replace this with vendor
 * logos**, and do not add an icon library to do it either.
 *
 * Both marks here are decoration by default (`aria-hidden`): the name they are
 * derived from is always written out next to them, and a screen reader gains
 * nothing from hearing "K L" before hearing "Kling". Pass `label` only when
 * the mark genuinely stands alone.
 */

const CJK = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;

/**
 * One or two characters standing in for a name.
 *
 * - `Nano Banana Pro` → `NB`  (initials of the first two words)
 * - `Kling`           → `KL`  (first two letters of a single word)
 * - `@some_handle`    → `SO`  (punctuation is not a letter)
 * - `视觉中国`         → `视觉` (CJK: two characters already read as a word)
 * - `""` / `"—"`      → `?`   (never an empty box)
 *
 * Deterministic and pure, so the server and the client always agree on it.
 */
export function monogramFrom(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (cleaned === "") return "?";

  const words = cleaned.split(/\s+/);
  const first = [...(words[0] ?? "")];
  const head = first[0] ?? "";

  // CJK has no "initials": one character is already a whole unit, so two of
  // them read as a word rather than as an abbreviation.
  if (CJK.test(head)) return first.slice(0, 2).join("");

  const second = words[1];
  if (second !== undefined) return (head + ([...second][0] ?? "")).toUpperCase();
  return first.slice(0, 2).join("").toUpperCase();
}

/** The first character of a name — the avatar's fallback when there is no image. */
export function initialFrom(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return [...cleaned][0]?.toUpperCase() ?? "?";
}

interface MarkAriaProps {
  /**
   * Accessible name. Omit — the normal case — and the mark is decoration,
   * because the name it is derived from is already on the card in text.
   */
  label?: string;
}

export interface IdentityMarkProps extends MarkAriaProps {
  /** The name the monogram is derived from. */
  name: string;
  className?: string;
}

/**
 * The bordered square: ~56px, stepping to 60px from `md`, white on the card's
 * own white so only the 2px frame draws it. Square corners, like everything
 * else that is not a pill.
 */
export function IdentityMark({ name, label, className }: IdentityMarkProps) {
  return (
    <span
      aria-hidden={label === undefined ? "true" : undefined}
      role={label === undefined ? undefined : "img"}
      aria-label={label}
      className={cx(
        "inline-flex size-14 shrink-0 items-center justify-center border-2 border-foreground bg-surface text-xl font-black tracking-tight tabular-nums md:size-15",
        className,
      )}
    >
      {monogramFrom(name)}
    </span>
  );
}

export interface AvatarProps extends MarkAriaProps {
  /** The person's name or handle. Drives both the alt text and the fallback. */
  name: string;
  /** Their picture. `null` / omitted falls back to the first character. */
  src?: string | null;
  /**
   * `sm` (28px, the default) sits inline with a card title; `md` (40px) is the
   * one a list of people leads with, where the face is the thing being
   * scanned. Two stops, not a scale: a third size would be a size nobody can
   * tell from the other two.
   */
  size?: AvatarSize;
  className?: string;
}

export type AvatarSize = "sm" | "md";

/** Intrinsic pixels, so the `<img>` reserves its box and never shifts layout. */
const AVATAR_PX: Record<AvatarSize, number> = { sm: 28, md: 40 };

const AVATAR_SHELL: Record<AvatarSize, string> = {
  sm: "size-7 text-xs",
  md: "size-10 text-sm",
};

/** The round variant, for a person rather than a product. */
export function Avatar({ name, src, label, size = "sm", className }: AvatarProps) {
  const px = AVATAR_PX[size];
  const shell = cx(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill border-2 border-foreground bg-surface font-black",
    AVATAR_SHELL[size],
    className,
  );

  if (src === undefined || src === null || src === "") {
    return (
      <span
        aria-hidden={label === undefined ? "true" : undefined}
        role={label === undefined ? undefined : "img"}
        aria-label={label}
        className={shell}
      >
        {initialFrom(name)}
      </span>
    );
  }

  return (
    <span aria-hidden={label === undefined ? "true" : undefined} className={shell}>
      {/* eslint-disable-next-line @next/next/no-img-element --
          Static export with images.unoptimized: next/image adds markup and a
          runtime here without optimising anything. 28-40px, so no srcSet
          either. */}
      <img
        src={src}
        alt={label ?? ""}
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-full object-cover"
      />
    </span>
  );
}
