import clsx from "clsx";

/** Small inline spinner, sized and coloured by the caller (`h-4 w-4
 *  text-foreground/60` in a menu row). Used where a tap starts a full-page
 *  navigation and the row needs to say "working" until the next page paints:
 *  the market picker and the mobile menu. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={clsx("animate-spin motion-reduce:animate-none", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        fill="currentColor"
      />
    </svg>
  );
}
