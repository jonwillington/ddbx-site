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
