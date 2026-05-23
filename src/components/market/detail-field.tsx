/** Stacked label-above-value pair used inside market DetailBody grids
 *  (Filing details, Instrument, Derivative, raw-filing fallbacks). All
 *  markets share this shape so the disclosure cards look uniform. */
export function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] text-muted uppercase tracking-wide mb-0.5">
        {label}
      </dt>
      <dd className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
