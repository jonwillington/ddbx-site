/** Copy shared by /mcp and the per-assistant pages (/claude, /chatgpt): the
 *  one honest boundary between what the connector sends and what stays behind
 *  the link. One list, so the pages cannot drift apart on it. */

/** What the connector sends and what stays behind the link. Two lists, one
 *  honest boundary. The right-hand list is the paid product and the reason
 *  the page can afford to give the left-hand one away. */
export const IN_THE_ANSWER = [
  "Who traded, and their role",
  "Buy or sell, and the transaction type",
  "Trade date and disclosure date",
  "Shares, price and value, in the filing’s own currency",
  "The ddbx rating: significant, noteworthy, minor or routine",
  "Sector",
  "Whether other insiders bought too, and how many",
  "A link to the filing’s ddbx page",
];

export const BEHIND_THE_LINK = [
  "The thesis: why this purchase matters, or does not",
  "Evidence for and evidence against",
  "Key risks",
  "The six-check rating checklist",
  "Return and alpha since disclosure",
];
