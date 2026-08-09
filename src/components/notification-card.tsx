/** One iOS-style push notification, as a card.
 *
 *  Lifted out of `HeroNotificationStack`, which drew it inline. It moved
 *  because the share-arrival hero on /t/{id} needs exactly the same object and
 *  a second hand-drawn copy is how the homepage and the share funnel end up
 *  disagreeing about what a ddbx alert looks like.
 *
 *  The stack renders this for its FRONT card only; the cards behind it are
 *  bare rims with no content, so they stay in the stack's own stylesheet.
 *
 *  Presentation is inline styles rather than Tailwind classes on purpose. The
 *  values are transcribed from a real notification and the stack transitions
 *  some of them (`max-height`, `background`) from its own CSS — expressing them
 *  as utility classes would have meant re-deriving each one and hoping the
 *  homepage hero survived it. `className` composes with that CSS: the stack
 *  passes `hns-card` for the bits it animates, and inline values that match
 *  the stylesheet exactly win the cascade without changing anything.
 */
import type { CSSProperties, ReactNode } from "react";

/** Card chrome. Near-opaque and warm-shifted dark — the same temperature
 *  family as the dark panel tone, so it sits inside a cream frame instead of
 *  reading as cool slate, and so a textured map behind it never bleeds
 *  through. */
const CARD: CSSProperties = {
  width: "100%",
  borderRadius: 22,
  padding: "14px 17px 15px",
  color: "#fff",
  textAlign: "left",
  background: "rgba(72, 66, 59, 0.96)",
  WebkitBackdropFilter: "blur(20px) saturate(150%)",
  backdropFilter: "blur(20px) saturate(150%)",
  border: "0.5px solid rgba(255, 255, 255, 0.14)",
  boxShadow: "0 14px 30px -16px rgba(0, 0, 0, 0.3)",
};

const HEAD: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};
const ICON: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 6,
  objectFit: "cover",
  flexShrink: 0,
};
const APP: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.01em",
  color: "rgba(255, 255, 255, 0.66)",
};
const TIME: CSSProperties = {
  marginLeft: "auto",
  fontSize: 12,
  color: "rgba(255, 255, 255, 0.42)",
};
const BODY: CSSProperties = {
  fontSize: 14.5,
  lineHeight: 1.34,
  color: "rgba(255, 255, 255, 0.9)",
};
const LEAD: CSSProperties = { fontWeight: 600, color: "#fff" };
/** The attention tag ("BREAKING", "SIGNIFICANT") — a warm-gold small-caps
 *  accent rather than a bell emoji, so the alert cue reads editorial. */
const TAG: CSSProperties = {
  marginRight: 6,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "#eec584",
};

export function NotificationCard({
  icon,
  app,
  tag,
  lead,
  body,
  time = "now",
  className = "",
  style,
}: {
  /** App icon shown in the banner header. */
  icon: string;
  /** App title, e.g. "ddbx.uk". */
  app: string;
  /** Small-caps attention tag before the lead. */
  tag: string;
  /** Ticker + company, e.g. "STAF · Staffline Group". */
  lead: string;
  /** The disclosure copy after the lead. */
  body: ReactNode;
  time?: string;
  className?: string;
  /** Merged over the card chrome — the stack uses it for nothing today, but a
   *  caller that needs a width cap shouldn't have to wrap the card to get one. */
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={{ ...CARD, ...style }}>
      <div style={HEAD}>
        <img alt="" src={icon} style={ICON} />
        <span style={APP}>{app}</span>
        <span style={TIME}>{time}</span>
      </div>
      <div style={BODY}>
        <span style={TAG}>{tag}</span>
        <span style={LEAD}>{lead}</span>. {body}
      </div>
    </div>
  );
}
