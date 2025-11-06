import { MultiServerMCPClient } from "@langchain/mcp-adapters";

export const clientTools = new MultiServerMCPClient({
  throwOnLoadError: true,
  prefixToolNameWithServerName: false,
  useStandardContentBlocks: true,
  mcpServers: {
    accessibility: {
      command: "npx",
      args: ["-y", "mcp-accessibility-scanner"],
      restart: {
        enabled: true,
        maxAttempts: 3,
        delayMs: 1000,
      },
    },
  },
});
