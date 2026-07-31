/** The perspective grid that trails away beneath the footer box.
 *
 *  Purely decorative: it gives the bottom of every page an ending instead of
 *  letting the content just stop. The footer sits on it as a raised sheet, so
 *  the two are designed together — the grid's horizon is the box's bottom edge,
 *  and the plane runs *towards* the viewer from there, cells opening up as they
 *  come forward. Read it as the surface the footer sheet is resting on.
 *
 *  How the geometry works, since the numbers look arbitrary otherwise:
 *
 *  - The wrapper carries `perspective` with its origin at `50% 0%`, which puts
 *    the eye level — and therefore the vanishing point — on the wrapper's top
 *    edge, i.e. flush with the underside of the box.
 *  - The plane is rotated about that same top edge (`transform-origin: 50% 0%`,
 *    `rotateX(78deg)`), which tips its far end towards the viewer. Everything
 *    below the origin gains +z, so it magnifies as it descends.
 *  - The plane is deliberately taller (500px) and wider (±25%) than the box it
 *    is clipped to. Its far edge projects well past the bottom of the wrapper;
 *    what you see is the near half, and the rest is cropped.
 *  - `perspective: 700px` is the lens. Shorter values fan the vertical lines
 *    out to a fish-eye and blow the near cells up to two per screen; this is
 *    roughly a normal lens at the 1280px content width.
 *
 *  The mask is what keeps it a detail rather than a motif — it fades the
 *  crowded band right under the horizon (where 1px lines converge and alias),
 *  the near edge, and both sides, so the grid dissolves into the page on every
 *  side instead of ending on a cut.
 *
 *  Colours are the brand hairline browns, not greys: warm-brown at low alpha on
 *  cream, brand amber at lower alpha on the dark page, where a light-on-dark
 *  line of the same alpha reads much louder.
 */
export function FooterTrail() {
  return (
    <div aria-hidden="true" className="footer-trail">
      <style>{`
        .footer-trail {
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          height: 7rem;
          overflow: hidden;
          pointer-events: none;
          perspective: 700px;
          perspective-origin: 50% 0%;
          -webkit-mask-image:
            linear-gradient(to bottom, transparent 0%, #000 10%, #000 38%, transparent 88%),
            linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%);
          mask-image:
            linear-gradient(to bottom, transparent 0%, #000 10%, #000 38%, transparent 88%),
            linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }
        @media (min-width: 768px) {
          .footer-trail { height: 14rem; }
        }
        .footer-trail-plane {
          position: absolute;
          top: 0;
          left: -25%;
          right: -25%;
          height: 500px;
          transform-origin: 50% 0%;
          transform: rotateX(78deg);
          background-image:
            repeating-linear-gradient(to right,  rgba(90, 65, 40, 0.34) 0 1px, transparent 1px 64px),
            repeating-linear-gradient(to bottom, rgba(90, 65, 40, 0.34) 0 1px, transparent 1px 34px);
        }
        :is(.dark) .footer-trail-plane {
          background-image:
            repeating-linear-gradient(to right,  rgba(238, 197, 132, 0.24) 0 1px, transparent 1px 64px),
            repeating-linear-gradient(to bottom, rgba(238, 197, 132, 0.24) 0 1px, transparent 1px 34px);
        }
      `}</style>
      <div className="footer-trail-plane" />
    </div>
  );
}
