// EDGAR reporter names, made readable.
//
// Form 4 files a natural person SURNAME-FIRST and often in caps: "HOLDING FRANK
// B JR", "Courtis Kenneth S.", "BIENAIME JEAN JACQUES". That is fine in a dense
// table where the reader is scanning issuers, and wrong on a page TITLED with
// the person's name — which is what the insider pages are, and what anyone
// searching for them types.
//
// `normalisedDisplayName` in src/lib/display-name.ts already fixes the caps.
// It cannot fix the order, because it is shared by UK, SE and NL, whose sources
// file names in natural order already — reordering there would break three
// markets to fix one. So this is US-only and additive.
//
// THE RULE IS CONSERVATIVE ON PURPOSE. Reordering a name wrongly puts a mangled
// version of a real person's name in a page title and a sitemap. Every case
// this cannot read confidently is LEFT AS FILED, which is exactly what ships
// today — so the failure mode is "no improvement", never "wrong name".

/** Tokens that mark a filer as an organisation rather than a person. EDGAR has
 *  no flag for this, and roles don't help: a fund and a person can both file
 *  solely as a ten-percent owner. The name is the only signal.
 *
 *  Tested from the SECOND token on, never the first, because a person's surname
 *  leads and several of these words ARE surnames. "HOLDING FRANK B JR" is Frank
 *  B Holding, a real filer at First Citizens; matching `holding` anywhere would
 *  file him as a company. "Energy Holding Corp" still matches, on `holding` at
 *  position 1 and `corp` at 2. */
const ENTITY = /^(l\.?l\.?c|l\.?l\.?p|l\.?p|lp|gp|inc|corp|co|ltd|limited|plc|trust|fund|funding|partners|capital|holdings?|group|ventures|management|advisors?|associates|investments?|sponsor|bancorp|insurance|asset|strategies|company)\.?$/i;

/** Surname particles. "VAN HANDEL MICHAEL J" is Michael J **Van Handel**, not
 *  Handel Michael J Van — the naive first-token rule mangles every Dutch,
 *  Portuguese and Spanish surname in the file. */
const PARTICLES = new Set([
  "van", "von", "de", "del", "della", "da", "di", "das", "dos", "du",
  "la", "le", "den", "der", "ten", "ter", "af", "al", "bin", "ibn", "st",
]);

/** Generational and honorific suffixes, which stay at the END after a reorder:
 *  "DIAZ GUILLERMO JR" is Guillermo Diaz Jr. */
const SUFFIXES = new Set([
  "jr", "sr", "ii", "iii", "iv", "v", "md", "phd", "cpa", "esq", "dds", "jd",
]);

const isInitial = (t) => /^[a-z]\.?$/i.test(t);
const clean = (t) => t.replace(/[.,]+$/, "");

/** Title-case a token, preserving the shapes that caps would destroy:
 *  "O'BRIEN" -> "O'Brien", "MCFARLAND" -> "McFarland", "JEAN-PAUL" ->
 *  "Jean-Paul", and a bare initial stays upper. */
function recase(token) {
  if (!token) return token;
  if (/^[A-Z]\.?$/.test(token)) return token;
  // "LLC", "L.P.", "GP" — title-casing these is the one thing that makes a
  // company name look auto-generated.
  if (ACRONYM.test(token)) return token.toUpperCase();

  const lower = token.toLowerCase();
  const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : w);
  let out = lower.replace(/^(o')(\w)/, (_, p, c) => `O'${c.toUpperCase()}`);

  if (out === lower) out = lower.replace(/^mc(\w)/, (_, c) => `Mc${c.toUpperCase()}`);
  if (out === lower) out = cap(lower);

  return out
    .split("-")
    .map((part, i) => (i === 0 ? part : cap(part)))
    .join("-");
}

/** Acronyms that must not be title-cased into "Llc" or "L.l.c.". */
const ACRONYM = /^(l\.?l\.?c|l\.?l\.?p|l\.?p|lp|gp|plc|nv|sa|ag|usa|reit|ii|iii|iv)\.?$/i;

/** True when the filer looks like an organisation. */
export function isEntityName(raw) {
  const tokens = String(raw ?? "")
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return tokens.slice(1).some((t) => ENTITY.test(t));
}

/**
 * "HOLDING FRANK B JR" -> "Frank B Holding Jr". Returns the input recased when
 * the order cannot be read confidently.
 */
export function usInsiderDisplayName(raw) {
  const input = String(raw ?? "").trim();

  if (!input) return input;

  // Organisations are already in reading order.
  if (isEntityName(input)) return recaseAll(input);

  // "Pigott, Thomas K." — the comma says exactly where the surname ends, so
  // this case needs no guessing at all.
  const comma = input.split(",");

  if (comma.length === 2 && comma[1].trim()) {
    return `${recaseAll(comma[1])} ${recaseAll(comma[0])}`.replace(/\s+/g, " ").trim();
  }
  if (comma.length > 2) return recaseAll(input);

  const tokens = input.split(/\s+/).filter(Boolean);

  if (tokens.length < 2) return recaseAll(input);

  // Trailing suffix comes off first so it can be put back at the end.
  let suffix = "";
  let end = tokens.length;

  while (end > 1 && SUFFIXES.has(clean(tokens[end - 1]).toLowerCase())) {
    suffix = `${recase(clean(tokens[end - 1]))} ${suffix}`.trim();
    end--;
  }
  const body = tokens.slice(0, end);

  if (body.length < 2) return recaseAll(input);

  // Surname: leading particles plus the token they attach to.
  let i = 0;

  while (i < body.length - 1 && PARTICLES.has(clean(body[i]).toLowerCase())) i++;
  const surname = body.slice(0, i + 1);
  const rest = body.slice(i + 1);

  if (rest.length === 0) return recaseAll(input);

  // BAIL ON ANYTHING AMBIGUOUS.
  //
  // A particle AFTER the surname means a compound we cannot split — "Morand De
  // Oliveira Bruno" could be Bruno Morand De Oliveira or Bruno De Oliveira
  // Morand and nothing in the string says which. More than two full forenames
  // means the same thing another way: "de Souza Funo Elaine Maria" is Elaine
  // Maria de Souza Funo, and taking "de Souza" as the whole surname would
  // publish "Funo Elaine Maria de Souza". Both are left exactly as filed.
  if (rest.some((t) => PARTICLES.has(clean(t).toLowerCase()))) return recaseAll(input);

  const words = rest.filter((t) => !isInitial(t));

  if (words.length > 2) return recaseAll(input);

  // Particles keep the casing the filer used — "de Silva", "Van Dyk" — unless
  // the filing shouted the whole name, in which case there is no casing to
  // preserve and title case is the best available guess.
  const shouted = input === input.toUpperCase();
  const surnameOut = surname.map((t, idx) => {
    const c = clean(t);

    return idx < surname.length - 1 && !shouted ? c : recase(c);
  });

  return [...rest.map((t) => recase(clean(t))), ...surnameOut, suffix]
    .filter(Boolean)
    .join(" ");
}

/** Recase a SHOUTED string, for values that are already in reading order —
 *  EDGAR issuer names ("DONEGAL GROUP INC"), which carry no ordering problem
 *  but do carry the caps. Exported so the directory and the pre-render treat a
 *  company the same way. */
export function recaseIfShouted(raw) {
  return recaseAll(raw);
}

/** Recase only a SHOUTED string. A filer who wrote "de Souza Funo Elaine Maria"
 *  chose that casing; when we have declined to reorder their name, rewriting it
 *  to "De Souza…" is a second liberty taken for no gain. Mirrors the >70%-caps
 *  test in src/lib/display-name.ts, which is the house rule for this. */
function recaseAll(s) {
  const str = String(s).trim();
  const letters = [...str].filter((c) => /[a-z]/i.test(c));

  if (letters.length === 0) return str;

  const upper = letters.filter((c) => c === c.toUpperCase()).length;

  if (upper / letters.length < 0.7) return str;

  return str.split(/\s+/).map((t) => recase(t)).join(" ");
}
