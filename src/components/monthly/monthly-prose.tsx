import { renderBold } from "./monthly-utils";

/** Renders a narrative paragraph with light `**bold**` emphasis. Splits on
 *  blank lines into separate paragraphs. */
export function Prose({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-[15px] leading-relaxed text-foreground/85">
          {renderBold(p).map((tok, j) =>
            typeof tok === "string" ? (
              tok
            ) : (
              <strong key={j} className="font-semibold text-foreground">
                {tok.bold}
              </strong>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
