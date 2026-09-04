import { Argument, CREDITS, linkProps } from '../../credit-shared';

/* Direction: the signed page. The two names are set large in a display italic — Instrument Serif,
   the one new face in this set — with the ampersand as an ornament between them. The stroke under
   a name is its own element, because a native underline cannot be drawn on. */
export default function Signature() {
  return <Argument>
    <div className="cr cr-signature">
      <p className="cr-label cr-label-centred">Credit to</p>
      <p className="cr-sig">
        <a className="cr-sig-name" href={CREDITS[0].href} {...linkProps} style={{ '--i': 0 } as React.CSSProperties}>
          {CREDITS[0].name}<span className="cr-stroke" aria-hidden="true" />
        </a>
        <span className="cr-sig-amp" aria-hidden="true">&amp;</span>
        <a className="cr-sig-name" href={CREDITS[1].href} {...linkProps} style={{ '--i': 1 } as React.CSSProperties}>
          {CREDITS[1].name}<span className="cr-stroke" aria-hidden="true" />
        </a>
      </p>
    </div>
  </Argument>;
}
