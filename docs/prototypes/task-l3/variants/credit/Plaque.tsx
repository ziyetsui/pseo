import { Argument, CREDITS, linkProps } from '../../credit-shared';

/* Direction: a small object rather than a line of text. Two rows, each a whole target with the
   name, the handle and the destination stated; the surface lifts on hover and presses on click.
   The only direction where the handles are visible, which is also the only direction that proves
   where the links go before you click them. */
export default function Plaque() {
  return <Argument>
    <div className="cr cr-plaque">
      <p className="cr-label">Credit to</p>
      <div className="cr-card">{CREDITS.map((person, i) => <a className="cr-row" key={person.href} href={person.href} {...linkProps} style={{ '--i': i } as React.CSSProperties}>
        <span className="cr-row-name">{person.name}</span>
        <span className="cr-row-handle">{person.handle}</span>
        <span className="cr-row-go" aria-hidden="true">↗</span>
      </a>)}</div>
    </div>
  </Argument>;
}
