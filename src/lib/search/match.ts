/** Ranking for the search palette.
 *
 *  Small, in-memory and deliberately boring: a few thousand issuers and
 *  insiders is well inside what a scoring loop over precomputed strings does in
 *  a frame, so there is no index structure and no dependency. What it has to
 *  get right is the ORDER, because a reader types three letters and takes the
 *  top row:
 *
 *    1. A ticker typed exactly is the answer — "BP" is BP, not BP Marsh.
 *    2. Then a name that starts with the query, then a ticker that does.
 *    3. Then every word of the query opening a word of the name, in any order
 *       ("toit hendrik" finds Hendrik du Toit).
 *    4. Then initials ("bat" finds British American Tobacco) and plain
 *       substrings.
 *    5. Last, one typo in a word of five letters or more ("barclys"), so a
 *       misspelling degrades to a lower row instead of an empty list. Four
 *       was tried and "barc" reached Barratt. The palette also drops this
 *       tier whenever anything scores FUZZY_FLOOR or better: a typo match is a
 *       fallback, not a neighbour for the real answer.
 *
 *  Activity breaks ties inside a tier, never across one: a busy issuer should
 *  not outrank an exact name match. */

/** Lower-cased, accent-free, punctuation folded to spaces. "Nestlé S.A." →
 *  "nestle s a"; "AT&T" → "at and t". */
export function normalise(s: string): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface Searchable {
  /** normalise(name) */
  n: string;
  /** Words of `n`. */
  words: string[];
  /** First letter of each word, for initials. */
  initials: string;
  /** normalise(ticker), or "" where there isn't one. */
  t: string;
  /** Secondary text the query may also hit at a lower weight — an insider's
   *  company, a page's group. */
  alt: string;
}

export function searchable(name: string, ticker = "", alt = ""): Searchable {
  const n = normalise(name);
  const words = n.split(" ").filter(Boolean);

  return {
    n,
    words,
    initials: words.map((w) => w[0]).join(""),
    t: normalise(ticker).replace(/ /g, ""),
    alt: normalise(alt),
  };
}

/** True when `a` and `b` are one edit apart (substitution, insertion,
 *  deletion or an adjacent swap). Linear, no matrix. */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;

  if (Math.abs(la - lb) > 1) return false;
  let i = 0;

  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;

    // Transposition: "barlcays" / "barclays".
    return (
      a[i] === b[i + 1] &&
      a[i + 1] === b[i] &&
      a.slice(i + 2) === b.slice(i + 2)
    );
  }

  return la > lb
    ? a.slice(i + 1) === b.slice(i)
    : a.slice(i) === b.slice(i + 1);
}

/** Does a query token open some word, allowing one typo on longer tokens?
 *  The typo compares against the word's prefix of the same length (±1), so
 *  "barcl" and "barclys" both reach "barclays". */
function tokenHits(
  token: string,
  words: string[],
  fuzzy: boolean,
): "exact" | "fuzzy" | null {
  if (words.some((w) => w.startsWith(token))) return "exact";
  if (!fuzzy || token.length < 5) return null;
  for (const w of words) {
    for (const len of [token.length, token.length - 1, token.length + 1]) {
      if (len > 0 && len <= w.length && withinOneEdit(token, w.slice(0, len)))
        return "fuzzy";
    }
  }

  return null;
}

/** The typo tier's score. Anything above it is a real match. */
export const FUZZY_SCORE = 200;
/** A best hit at or above this makes typo matches noise. */
export const FUZZY_FLOOR = 400;

/** Score for one item, or 0 when it does not match at all. `q` must already
 *  be normalise()d. */
export function score(q: string, s: Searchable): number {
  if (!q) return 0;
  const compact = q.replace(/ /g, "");

  if (s.t && compact === s.t) return 1000;
  if (s.n === q) return 950;
  if (s.n.startsWith(q)) return 800 - Math.min(s.n.length - q.length, 60);
  if (s.t && compact.length >= 2 && s.t.startsWith(compact))
    return 720 - (s.t.length - compact.length) * 10;

  const tokens = q.split(" ").filter(Boolean);
  const hits = tokens.map((t) => tokenHits(t, s.words, false));

  if (hits.every(Boolean)) {
    // In the name's own order reads as the stronger match.
    const inOrder = s.n.includes(q) ? 40 : 0;

    return 600 + inOrder - Math.min(s.words.length, 20);
  }

  if (
    tokens.length === 1 &&
    compact.length >= 2 &&
    s.initials.startsWith(compact)
  )
    return 480;
  if (compact.length >= 3 && s.n.replace(/ /g, "").includes(compact))
    return 400;

  if (s.alt) {
    const altWords = s.alt.split(" ");

    if (tokens.every((t) => tokenHits(t, altWords, false))) return 300;
  }

  const fuzzy = tokens.map((t) => tokenHits(t, s.words, true));

  if (fuzzy.every(Boolean)) return FUZZY_SCORE;

  return 0;
}

/** Split `text` into runs, marking the ones a query token opens, for the
 *  highlight. Works on the display string, not the normalised one, so it
 *  matches case-insensitively at word starts and gives up quietly on accents —
 *  an unhighlighted hit is fine, a mis-highlighted one is not. */
export function highlight(
  text: string,
  q: string,
): { text: string; hit: boolean }[] {
  const tokens = normalise(q).split(" ").filter(Boolean);

  if (!tokens.length || !text) return [{ text, hit: false }];
  const marks = new Array<boolean>(text.length).fill(false);
  const lower = text.toLowerCase();

  for (const t of tokens) {
    let from = 0;

    while (from < lower.length) {
      const i = lower.indexOf(t, from);

      if (i === -1) break;
      const atWordStart = i === 0 || !/[a-z0-9]/i.test(lower[i - 1]);

      if (atWordStart) {
        for (let k = i; k < i + t.length; k++) marks[k] = true;
        break;
      }
      from = i + 1;
    }
  }

  const out: { text: string; hit: boolean }[] = [];

  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1];

    if (last && last.hit === marks[i]) last.text += text[i];
    else out.push({ text: text[i], hit: marks[i] });
  }

  return out;
}
