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
      <dt className="micro text-muted mb-0.5">{label}</dt>
      <dd className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
