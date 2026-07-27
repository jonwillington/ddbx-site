import {
  BR,
  CN,
  DE,
  ES,
  FR,
  GB,
  IT,
  JP,
  SA,
} from "country-flag-icons/react/3x2";

/** The localisation point, deliberately NOT a card.
 *
 *  It sits after the six feature cards and is the odd one out on purpose:
 *  those six are fields that arrive in every row, this is a scope decision
 *  taken once at contract time. Giving it a seventh box implied it was a
 *  seventh field. So it loses the border, the tinted icon well and the
 *  left-set grid rhythm, and takes the page's only centred moment instead.
 *
 *  Flags rather than a LanguageIcon: one glyph says "languages exist", nine
 *  overlapping flags say how far this actually goes, in the space of a
 *  glance. They are illustrative of demand, not a shipped list, which is why
 *  the copy underneath talks about scope rather than naming locales.
 *
 *  The ring on each flag is `ring-background` so the stack reads as cut out
 *  of the page. If this block is ever moved onto a card or a band, that ring
 *  has to change with it or the overlap turns into a smudge.
 */
const LANGUAGES = [
  { code: "en", label: "English", Flag: GB },
  { code: "es", label: "Spanish", Flag: ES },
  { code: "fr", label: "French", Flag: FR },
  { code: "de", label: "German", Flag: DE },
  { code: "pt", label: "Portuguese", Flag: BR },
  { code: "it", label: "Italian", Flag: IT },
  { code: "ja", label: "Japanese", Flag: JP },
  { code: "zh", label: "Chinese", Flag: CN },
  { code: "ar", label: "Arabic", Flag: SA },
];

export function LanguageStrip() {
  return (
    <div className="mx-auto max-w-[60ch] text-center">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {LANGUAGES.map(({ code, label, Flag }) => (
          <li key={code}>
            <Flag
              aria-hidden="true"
              className="h-8 w-12 rounded-[4px] ring-1 ring-white/15"
            />
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-7 text-[22px] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-[26px]">
        Written in the language you need
      </h3>
      <p className="mx-auto mt-3 max-w-[50ch] text-[15px] leading-[1.6] text-white/55">
        Summary, thesis, evidence and risks are written per row, so the language
        they land in is a scope question rather than a rebuild. Source fields
        keep the register&rsquo;s own words: a Swedish filing stays Swedish.
      </p>
    </div>
  );
}
