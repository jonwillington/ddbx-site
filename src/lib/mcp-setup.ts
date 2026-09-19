import type { Snippet } from "@/components/api/code-tabs";

import { MCP_URL } from "@/lib/mcp";

/** How to add the connector, per client. The one source of set-up copy: /mcp
 *  renders it as tabs, the sidebar's "Use ddbx in" badges as popovers.
 *
 *  Menu labels drift, so each snippet is short and the address does the work.
 *  Written as plain steps rather than prose: a reader with the settings screen
 *  open wants a list to follow, not a paragraph. */
export const MCP_SNIPPETS: Snippet[] = [
  {
    label: "ChatGPT",
    title: "Settings → Apps & Connectors",
    meta: "Developer mode",
    code: `1. Open Settings, then Apps & Connectors
2. Turn on Developer mode
3. Choose Create, and paste the address
   ${MCP_URL}
4. Authentication: None
5. Save. Ask: "What did UK directors buy this week?"`,
  },
  {
    label: "Claude",
    title: "Settings → Connectors",
    meta: "web and desktop",
    code: `1. Open Settings, then Connectors
2. Choose Add custom connector
3. Name it ddbx and paste the address
   ${MCP_URL}
4. Add. It needs no sign-in.
5. Ask: "Has anyone at Barclays bought shares lately?"`,
  },
  {
    label: "Claude Code",
    title: "Terminal",
    meta: "one command",
    code: `claude mcp add --transport http ddbx ${MCP_URL}

# then, inside a session:
# > what did ddbx make of today's US filings?`,
  },
  {
    label: "Cursor / VS Code",
    title: "MCP settings",
    meta: "remote HTTP server",
    code: `// Add a remote (HTTP) MCP server. Cursor: mcp.json;
// VS Code: .vscode/mcp.json. No headers, no token.
{
  "servers": {
    "ddbx": { "type": "http", "url": "${MCP_URL}" }
  }
}`,
  },
];

/** The Claude Code one-liner, as the Claude Code snippet opens with. */
export const CLAUDE_CODE_COMMAND = `claude mcp add --transport http ddbx ${MCP_URL}`;

/** One-click installs. Unlike ChatGPT and Claude, which have no link that adds
 *  a custom connector, the two editors register URL handlers that open an
 *  install prompt. A custom scheme does nothing when the app is missing, so
 *  every place these appear also shows the manual snippet.
 *
 *  Cursor: `config` is the server entry (not the `mcpServers` wrapper),
 *  JSON-stringified then base64'd. VS Code: the entry plus its `name`,
 *  JSON-stringified then URI-encoded. Formats per each editor's docs,
 *  checked 2026-09-19. */
export const CURSOR_INSTALL_URL = `cursor://anysphere.cursor-deeplink/mcp/install?name=ddbx&config=${btoa(
  JSON.stringify({ url: MCP_URL }),
)}`;

export const VSCODE_INSTALL_URL = `vscode:mcp/install?${encodeURIComponent(
  JSON.stringify({ name: "ddbx", type: "http", url: MCP_URL }),
)}`;
