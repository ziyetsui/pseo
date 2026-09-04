import { Argument, CREDITS, linkProps } from '../../credit-shared';

/* Direction: the book colophon. A hairline, a small-caps label, the two names in the page's own
   serif. It is the quietest thing that can still read as a credit rather than as a footnote, and
   it is the only direction that adds no new typeface. Motion is one wipe and one lift, once. */
export default function Colophon() {
  return <Argument>
    <div className="cr cr-colophon">
      <span className="cr-rule" aria-hidden="true" />
      <p className="cr-line">
        <span className="cr-label">Credit to</span>
        {CREDITS.map((person, i) => <span className="cr-name" key={person.href} style={{ '--i': i } as React.CSSProperties}>
          <a href={person.href} {...linkProps}>{person.name}</a>
          {i === 0 ? <span className="cr-amp" aria-hidden="true">&amp;</span> : null}
        </span>)}
      </p>
    </div>
  </Argument>;
}
