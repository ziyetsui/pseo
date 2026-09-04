/* The two people being credited, and the one block every direction sits under.
   Handles supplied by the user: https://x.com/VincentWu11 and https://x.com/st3v3li. Nothing here
   is inferred — a credit with a guessed handle is worse than no credit. */
export const CREDITS = [
  { name: 'Vincent Wu', handle: '@VincentWu11', href: 'https://x.com/VincentWu11' },
  { name: 'Steve Li', handle: '@st3v3li', href: 'https://x.com/st3v3li' },
] as const;

/* The shipped first screen, copied verbatim out of frontend/src/components/Hub.tsx. Every variant
   renders THIS component and passes only the credit as a child, so "nothing else changes" is a
   structural fact rather than a promise — the verification diffs it against the baseline. */
export function Argument({ children }: { children?: React.ReactNode }) {
  return <section className="wrap argument"><h1>Somebody already wrote this</h1><div className="body">
    <p>Every prompt in this library was published in the open by the person who wrote it, and then mostly lost — buried under a feed that is optimised for the next thing rather than the useful thing.</p>
    <p>So the whole of the work here is <em>not editing</em>. No paraphrase, no house style, no distillation into a template. The text you copy is the text they posted, down to the render settings at the end that look like noise and are not.</p>
    <p>What we add is the index, the attribution, and a link back. That is the entire product.</p>
  </div>{children}</section>;
}
/* One external-link contract for all four directions, matching how the codebase links source posts. */
export const linkProps = { target: '_blank', rel: 'nofollow noopener noreferrer' } as const;
