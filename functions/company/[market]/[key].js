// Permanent redirect from the first URL shape company pages shipped with.
//
// /company/UK/MTLN.L  ->  /company/mtln
// /company/US/FCNCA   ->  /company/fcnca
//
// The market segment was redundant — the domain already says which market a
// page belongs to — and the LSE ".L" suffix is a storage detail, not something
// a reader should see in a URL. The old shape was live for well under a day,
// but it was in a published sitemap, so it redirects rather than 404s.
//
// A US key requested on ddbx.uk (or vice versa) crosses to the domain that
// owns it, which is where the canonical always pointed.

const MARKET_HOST = { UK: "ddbx.uk", US: "ddbx.us" };

export async function onRequestGet(context) {
  const { params } = context;
  const market = String(params.market ?? "").toUpperCase();
  const slug = decodeURIComponent(String(params.key ?? ""))
    .replace(/\.L$/i, "")
    .toLowerCase();
  const host = MARKET_HOST[market];

  if (!host || !slug) return Response.redirect("https://ddbx.uk/companies", 301);

  return Response.redirect(
    `https://${host}/company/${encodeURIComponent(slug)}`,
    301,
  );
}
