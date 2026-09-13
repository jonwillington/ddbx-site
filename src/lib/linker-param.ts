// Google's cross-domain linker parameter.
//
// `src/lib/cookie-consent.ts` configures gtag with a `linker` over ddbx.uk,
// ddbx.us and ddbx.eu so a reader crossing between the markets keeps one
// session instead of referring us to ourselves. The mechanism is a `_gl`
// parameter stapled onto the outbound link, carrying the client id and the
// session state — base64, several hundred characters, and completely opaque:
//
//   /?_gl=1*1ef137l*_ga*MTIxMDgxMzAwMy4xNzc1OTc2NjU2*_ga_0HHXDL7DE2*czE3O…
//
// It is read exactly once, by gtag.js, on arrival. After that it is litter,
// and litter with two costs beyond how it looks in the address bar: it is
// copied into whatever the reader shares or bookmarks, and — because it is
// unique per session — it fragments GA4's own landing-page report into one
// row per visit. The second is the same class of damage as the doubled query
// strings described in `src/components/document-title.tsx`.
//
// So: `_gl` never reaches GA as part of `page_location` (DocumentTitle
// normalises it out), and it is taken out of the address bar once gtag.js has
// had its turn (LinkerParamCleanup). Nothing else should read it.

export const LINKER_PARAM = "_gl";

/** `search` with `_gl` removed, normalised to `""` or `"?…"`.
 *
 *  Returns the input untouched when there is no `_gl` to remove, so the common
 *  case neither allocates nor re-encodes the rest of the query string. */
export function withoutLinkerParam(search: string): string {
  // Cheap reject first; `?utm_source=_gl` would pass this and fail the next.
  if (!search.includes(LINKER_PARAM)) return search;

  const params = new URLSearchParams(search);

  if (!params.has(LINKER_PARAM)) return search;
  params.delete(LINKER_PARAM);

  const rest = params.toString();

  return rest ? `?${rest}` : "";
}
