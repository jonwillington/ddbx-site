/** Android robot mark for Google Play CTAs — the Android counterpart to
 *  `AppleGlyph`. One copy: the navbar, the floating mobile CTA and the
 *  download landing page all render the same mark, so it lives here rather
 *  than being pasted per call-site. */
export function AndroidGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M17.523 15.341c-.552 0-1-.449-1-1 0-.552.448-1 1-1s1 .448 1 1c0 .551-.448 1-1 1m-11.046 0c-.552 0-1-.449-1-1 0-.552.448-1 1-1s1 .448 1 1c0 .551-.448 1-1 1m11.405-6.02l1.997-3.46a.416.416 0 0 0-.152-.567.416.416 0 0 0-.568.152l-2.022 3.503A12.34 12.34 0 0 0 12 7.85c-1.853 0-3.59.393-5.137 1.099L4.841 5.446a.416.416 0 0 0-.568-.152.416.416 0 0 0-.152.567l1.997 3.46C2.688 11.187.343 14.659 0 18.761h24c-.343-4.102-2.689-7.574-6.118-9.44" />
    </svg>
  );
}
