/** The wash behind the footer.
 *
 *  A soft warm glow rising from the bottom edge of the page, with the footer
 *  box sitting on it as a raised sheet. Three earlier attempts lived here — a
 *  perspective floor grid, a field of ticks, and a field of raked tonal bands —
 *  and all three failed the same way: they were *drawings*, and a drawing at
 *  the bottom of every page competes with the page. What the bottom wanted was
 *  a tone, not a graphic.
 *
 *  Notes for anyone retuning it:
 *
 *  - **It's one wide, flat ellipse anchored below the bottom edge**, so only
 *    its top arc is visible and the glow reads as coming from off-page rather
 *    than as a circle painted on it. Move the `at 50% 118%` centre up and it
 *    immediately looks like a blob.
 *  - **Percentage sizing, not px.** Unlike the band field this replaced, the
 *    shape has no internal geometry to keep square with anything, so it can
 *    scale with the footer's very variable height and stay in proportion.
 *  - **Keep the alpha low and the stops far apart.** The moment there's a
 *    visible edge anywhere in the ramp it stops being a wash. If you want it
 *    stronger, raise the centre alpha before you tighten the stops.
 *  - Dark mode is a *lift*, not a tint: near-black warmed slightly, at roughly
 *    half the strength, because the same spread that reads as soft on cream
 *    reads as a smudge on a near-black page.
 */
export function FooterTrail() {
  return (
    <div aria-hidden="true" className="footer-trail">
      <style>{`
        .footer-trail {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          background-image:
            radial-gradient(120% 86% at 50% 118%, rgba(186,155,113,0.30) 0%, rgba(186,155,113,0.13) 38%, rgba(186,155,113,0.04) 62%, transparent 80%),
            radial-gradient(58% 52% at 50% 112%, rgba(214,188,150,0.24) 0%, rgba(214,188,150,0.06) 55%, transparent 78%);
        }
        :is(.dark) .footer-trail {
          background-image:
            radial-gradient(120% 86% at 50% 118%, rgba(255,214,158,0.10) 0%, rgba(255,214,158,0.045) 38%, rgba(255,214,158,0.015) 62%, transparent 80%),
            radial-gradient(58% 52% at 50% 112%, rgba(255,226,180,0.07) 0%, rgba(255,226,180,0.02) 55%, transparent 78%);
        }
      `}</style>
    </div>
  );
}
