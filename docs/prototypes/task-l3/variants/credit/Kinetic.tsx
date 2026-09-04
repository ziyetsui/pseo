import { Argument, CREDITS, linkProps } from '../../credit-shared';

/* Direction: the credit is the motion. Each name is dealt out letter by letter on arrival and the
   stroke traces itself under whichever name you point at. The glyph spans are aria-hidden and the
   real name sits beside them for assistive tech, so the effect never costs the text. */
const letters = (word: string, offset: number) => [...word].map((glyph, i) => (
  <span className="cr-glyph" key={i} style={{ '--i': offset + i } as React.CSSProperties}>{glyph === ' ' ? ' ' : glyph}</span>
));
export default function Kinetic() {
  let offset = 0;
  return <Argument>
    <div className="cr cr-kinetic">
      <p className="cr-label">Credit to</p>
      <p className="cr-kin">
        {CREDITS.map((person, index) => {
          const start = offset; offset += person.name.length + 3;
          return <span className="cr-kin-part" key={person.href}>
            <a className="cr-kin-name" href={person.href} {...linkProps}>
              <span className="vh">{person.name}</span>
              <span aria-hidden="true">{letters(person.name, start)}</span>
              <span className="cr-stroke" aria-hidden="true" />
            </a>
            {index === 0 ? <span className="cr-kin-amp" aria-hidden="true" style={{ '--i': start + person.name.length } as React.CSSProperties}>&amp;</span> : null}
          </span>;
        })}
      </p>
    </div>
  </Argument>;
}
