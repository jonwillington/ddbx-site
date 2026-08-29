// Display-only normalisation of BLOCK CAPS company / insider names.
// Mirrors `String.normalisedForDisplay` in ddbx-ios-app
// (Sources/DdbxApp/Core/Trade/DisplayName.swift) so UK / US / SE / NL
// rows render the same shape on web and iOS without either side
// mutating the wire-format Codable.
//
// US Form 4 reporters arrive as "LU YANG" / "SIDDIQUI WISNESKI
// FRANCIS V JR"; UK RNS occasionally shouts the surname too. Both
// render cleanly once title-cased, but only when we preserve real
// acronyms (LLC, PLC, REIT, IBM, AG, AB, etc.) and Roman-numeral
// name suffixes ("John Smith III") from getting bulldozed to "Llc"
// / "Iii".

// Stays uppercase when the parent string is being re-cased. Kept
// intentionally small — common corporate suffixes like LTD / INC /
// CORP fall through to title-casing because "Ltd" / "Inc" / "Corp"
// is the right user-facing form.
const PRESERVED_ACRONYMS = new Set([
  // Country / region codes that appear in company / director rows.
  "USA",
  "UK",
  "EU",
  "UAE",
  // Continental + Scandinavian corporate suffixes — title-cased
  // forms ("Ericsson Ab") read wrong; keep these uppercase.
  "AG",
  "AB",
  "NV",
  "BV",
  "SA",
  "OY",
  "OYJ",
  "ASA",
  // Well-known business / regulatory acronyms.
  "IBM",
  "TSMC",
  "LLC",
  "PLC",
  "REIT",
  "ETF",
  "SPAC",
  "PDMR",
  "ADR",
  "ADS",
  "ESG",
  "IPO",
  "AI",
  "ML",
  // Roman numerals used as name suffixes ("John Smith III").
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
]);

const LETTER_RE = /\p{L}/u;
const TRAILING_PUNCT_RE = /^[^\p{L}\p{N}&]+|[^\p{L}\p{N}&]+$/gu;

/// Title-case an ALL-CAPS string for display. Mixed-case strings
/// pass through untouched (preserves intentional brand casing like
/// "deepMind" / "iPhone"). Threshold: ≥70% of alpha chars must be
/// uppercase before we touch the string.
export function normalisedDisplayName(raw: string): string {
  if (!raw) return raw;
  const letters = [...raw].filter((c) => LETTER_RE.test(c));

  if (letters.length === 0) return raw;
  const upperCount = letters.filter(
    (c) => c === c.toUpperCase() && c !== c.toLowerCase(),
  ).length;

  if (upperCount / letters.length < 0.7) return raw;

  return raw.split(" ").map(recaseWord).join(" ");
}

/// Capitalise the first letter of an insider's role for display. Role strings
/// arrive inconsistently cased across markets — US Form 4 derives bare
/// "director" / "officer" / "10% holder" from the reporter flags but passes
/// `officer_title` ("Chief Banking Officer") through verbatim, so a list mixes
/// the two and the lowercase ones read as a bug. Only the first character is
/// touched: the rest of the string keeps whatever casing it arrived with, so
/// "10% holder" and any already-correct title survive intact.
export function capitalisedRole(raw: string): string;
export function capitalisedRole(raw: undefined): undefined;
export function capitalisedRole(raw?: string): string | undefined;
export function capitalisedRole(raw?: string): string | undefined {
  if (!raw) return raw;

  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/// Strip a trailing "(ticker)" parenthetical from a company name when it
/// duplicates the row's ticker (case-insensitive, ".L" suffix tolerated).
/// Upstream RNS / EDGAR feeds occasionally append the ticker to the
/// company string ("Sig (shi)", "3i Group (III)"); the chip column
/// already shows the ticker, so the parenthetical is just noise.
export function stripTickerSuffix(company: string, ticker: string): string {
  if (!company || !ticker) return company;
  const t = ticker.replace(/\.[A-Z]+$/i, "").toLowerCase();

  if (!t) return company;
  const re = new RegExp(`\\s*\\(${escapeRegExp(t)}\\)\\s*$`, "i");

  return company.replace(re, "").trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function recaseWord(word: string): string {
  if (word.length === 0) return word;
  // Strip surrounding punctuation for the lookup so "LTD." still
  // hits "LTD" in the allowlist. Return the original word — uppercased
  // for preserved acronyms, title-cased otherwise.
  const core = word.replace(TRAILING_PUNCT_RE, "").toUpperCase();

  if (PRESERVED_ACRONYMS.has(core)) {
    return word.toUpperCase();
  }

  // A shouted token mixing letters and digits is a brand or a symbol, never an
  // English word: KRM22, V3TC, MAB1. Title-casing gives "Krm22", which reads as
  // a typo. Mirrors recaseWord in ddbx-data worker/lib/display-name.ts.
  if (/[0-9]/.test(core) && /[A-Z]/.test(core) && word === word.toUpperCase()) {
    return word;
  }

  return titleCaseWord(word);
}

// Lowercase everything after the first letter of each subword
// (handles hyphens + apostrophes by re-using the boundary).
function titleCaseWord(word: string): string {
  return word
    .toLowerCase()
    .replace(
      /(^|[-'\s])(\p{L})/gu,
      (_, sep: string, ch: string) => sep + ch.toUpperCase(),
    );
}

// ── Trailing bookkeeping the scrape sources append to a legal name ──────────
// Ports of the canonical regexes in ddbx-data `worker/lib/display-name.ts`
// (mirrored again in iOS `DisplayName.swift`), in the same order. None of it
// means anything to a reader: "AOTI, Inc. (DI) (Regs, Cat 3)" is a listing
// clerk's note, and it was eating a whole card line on the homepage.

// Instrument / regulatory tokens. Sources mix a bare form ("Boku, Inc (DI)
// Reg S Cat 3/144A") with a parenthesised one ("Tinybuild Inc. (DI) (Reg S /
// 144A)"), so a trailing RUN of either is stripped. `Cat` requires a digit so
// a share class like "Cat A" survives.
const PAREN_TOKEN = String.raw`(?:C?DI|Reg\.?\s*S|Rule\s*144A|144A|Cat(?:egory)?\.?\s*\d+)`;
// "DI" is excluded from the bare form so a legitimate trailing word "DI" is
// only stripped when it's actually bracketed.
const BARE_TOKEN = String.raw`(?:Reg\.?\s*S|Rule\s*144A|144A|Cat(?:egory)?\.?\s*\d+)`;
// Inside a bracketed group the sources separate tokens with spaces, slashes
// *or* commas — the LSE feed emits "(DI) (Regs, Cat 3)" as readily as "(Reg S
// / 144A)". The comma is allowed only inside the brackets: a comma between
// bare units would put "Cat 3" within reach of a name ending in a comma'd
// clause.
const SUFFIX_UNIT = `(?:\\(\\s*${PAREN_TOKEN}(?:[\\s/,;]+${PAREN_TOKEN})*\\s*\\)|${BARE_TOKEN})`;
const INSTRUMENT_SUFFIX_RUN = new RegExp(
  `(?:[\\s/]*${SUFFIX_UNIT})+\\s*$`,
  "i",
);

// Share-class tails: "Twentyfour Income Fund Limited Ord Red", "… Ord Shs".
// Requires the "Ord"/"Ordinary" head so an ordinary word is never eaten.
const SHARE_CLASS_TAIL =
  /\s+Ord(?:inary)?(?:\s+(?:Red|Redeem(?:able)?|Shs|Shares|NPV|Npv|Stock))*\s*$/i;

// "No Par Value" is a share-class marker, never part of a legal name, and the
// feed appends it bare as well as after an "Ord" head.
const BARE_NPV_TAIL = /\s+NPV\s*$/i;

// Trailing listing / registration qualifiers: "(Singapore Reg)", "(Regd)".
// Deliberately narrow — the bracket must carry a registration or share-class
// word and stay short — so a real trailing bracket like "(Holdings)" survives.
const LISTING_PARENTHETICAL =
  /\s*\((?=[^)]{0,24}\))[^)]*\b(?:reg|regd|registered|shs|shares|npv)\b[^)]*\)\s*$/i;

// The RNS feed moves a leading definite article to the end of the legal name
// ("Berkeley Group Holdings (The)"). Reads as a typo in a headline.
const TRAILING_ARTICLE = /\s*\(\s*the\s*\)\s*$/i;

const STATE_MARKER = /\s*\/[A-Z]{2}\/?\s*$/g;

/// Strip the trailing bookkeeping run. Names stack these ("… Ord Red
/// (Singapore Reg)") and removing one tail exposes the next, so this runs to a
/// fixed point. A pass that would empty the string is discarded — a name that
/// is *only* bookkeeping is a data problem, and showing it beats showing
/// nothing.
export function stripInstrumentSuffixes(name: string): string {
  let out = name.trim();

  for (;;) {
    const before = out;

    out = out
      .replace(INSTRUMENT_SUFFIX_RUN, "")
      .replace(LISTING_PARENTHETICAL, "")
      .replace(TRAILING_ARTICLE, "")
      .replace(SHARE_CLASS_TAIL, "")
      .replace(BARE_NPV_TAIL, "")
      .trim();
    if (out === before || out === "") break;
  }

  return out || name.trim();
}

/// A wire company name as a reader should see it: state-of-incorporation
/// marker, trailing ticker bracket, instrument/regulatory suffix run and
/// share-class tail removed, then re-cased.
///
///   "Hercules Plc (HERC)"                    -> "Hercules Plc"
///   "AOTI, INC. (DI) (Regs, Cat 3) (AOTI)"   -> "Aoti, Inc."
///   "Columbia Financial, Inc./MD/"           -> "Columbia Financial, Inc."
///   "Berkeley Group Holdings (The)"          -> "Berkeley Group Holdings"
///   "IMI" + ticker "IMI.L"                   -> "IMI"
///
/// Order matters and mirrors the canonical: the ticker bracket goes before the
/// suffix run (it would otherwise anchor the run away from the end), and
/// re-casing comes last so it sees the cleaned name rather than counting the
/// suffix's lower-case letters against the shouting test.
export function displayCompany(
  company: string,
  ticker?: string | null,
): string {
  const original = company.trim();
  let name = original.replace(STATE_MARKER, "").trim();

  if (ticker) name = stripTickerSuffix(name, ticker);
  name = stripInstrumentSuffixes(name);

  // An issuer whose whole name IS its ticker is an initialism the market knows
  // in capitals — IMI, GSK, KRM22 — and title-casing gives "Imi" / "Gsk".
  if (isTickerLikeName(name, ticker)) return name;

  return normalisedDisplayName(name) || original;
}

/// True when `name` is a single shouted token matching the ticker root.
function isTickerLikeName(name: string, ticker?: string | null): boolean {
  if (!ticker) return false;
  const trimmed = name.trim();

  if (!trimmed || /\s/.test(trimmed)) return false;
  const core = trimmed.replace(/[^A-Za-z0-9]/g, "");

  if (!core || core !== core.toUpperCase() || !/[A-Z]/.test(core)) return false;
  const root = ticker
    .replace(/\.[A-Za-z]+$/, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

  if (root.length < 2) return false;

  return core === root || core.startsWith(root) || root.startsWith(core);
}
