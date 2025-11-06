import { HumanMessage } from "@langchain/core/messages";
import { createAgentWithPrompt } from "@/lib/agent";
import {
  PAGE_SCANNER_AGENT_PROMPT,
  SUMMARIZER_AGENT_PROMPT,
  URL_DISCOVERY_AGENT_PROMPT,
} from "@/lib/agent-prompts";
import type {
  MultiAgentScanResult,
  PageScanResult,
  UrlDiscoveryResult,
} from "@/lib/multi-agent-types";
import pMap from "p-map";

export async function runDiscoveryAgent(
  mainUrl: string,
): Promise<UrlDiscoveryResult> {
  const agent = await createAgentWithPrompt(URL_DISCOVERY_AGENT_PROMPT);

  const prompt = `Analyze this URL and discover the most important pages to scan: ${mainUrl}

Follow these steps:
1. Navigate to the URL in headless mode
2. Handle any cookie banners or modals
3. Get the page HTML snapshot
4. Identify 3-4 key URLs (prioritize: signup, login, checkout, forms, main features)
5. Close the browser
6. Return the results in the exact JSON format specified in your system prompt

Remember: Return ONLY the JSON object, no additional text or markdown.`;

  const messages = [new HumanMessage(prompt)];
  const invokeResult = await agent.invoke(
    { messages },
    {
      recursionLimit: 26,
      signal: AbortSignal.timeout(120000),
    },
  );

  const lastMessage = invokeResult.messages[invokeResult.messages.length - 1];
  return parseDiscoveryResult(String(lastMessage.content));
}

async function scanSingleUrl(url: string): Promise<PageScanResult> {
  const agent = await createAgentWithPrompt(PAGE_SCANNER_AGENT_PROMPT);

  const messages = [
    new HumanMessage(
      `Scan this URL for accessibility violations: ${url}

Follow these steps:
1. Navigate to the URL in headless mode
2. Handle any cookie banners or modals
3. Wait for the page to fully load
4. Run the scan_page tool
5. Analyze the results
6. Close the browser
7. Return a markdown-formatted accessibility report

Format your response as specified in your system prompt.`,
    ),
  ];

  const invokeResult = await agent.invoke(
    { messages },
    { recursionLimit: 30, signal: AbortSignal.timeout(120_000) },
  );

  const lastMessage = invokeResult.messages[invokeResult.messages.length - 1];
  const scanData = String(lastMessage.content);
  const violations = extractViolationCount(scanData);

  return { url, scanData, violations, timestamp: new Date().toISOString() };
}

export async function runPageScannerAgentBatch(
  urls: string[],
): Promise<PageScanResult[]> {
  return pMap(urls, scanSingleUrl, { concurrency: 3 });
}

export async function runSummarizerAgent(
  discoveryResult: UrlDiscoveryResult,
  pageScanResults: PageScanResult[],
): Promise<string> {
  const agent = await createAgentWithPrompt(SUMMARIZER_AGENT_PROMPT);

  const scanReports = pageScanResults
    .map(
      (scan, index) => `
## Page ${index + 1}: ${scan.url}
**Violations Found:** ${scan.violations}

${scan.scanData}
`,
    )
    .join("\n\n---\n\n");

  const totalViolations = pageScanResults.reduce(
    (sum, scan) => sum + scan.violations,
    0,
  );

  const prompt = `Create a comprehensive accessibility report combining the following scan results:

**Main URL:** ${discoveryResult.mainPageUrl}
**Pages Scanned:** ${pageScanResults.length}
**Total Violations Across All Pages:** ${totalViolations}

**Individual Page Scan Results:**

${scanReports}

IMPORTANT: The scan data above contains ${totalViolations} total violations. Make sure to include ALL violations from each page in your comprehensive report. Do NOT say there are 0 violations when violations are present in the scan data above.

Analyze all the above results and create a unified, comprehensive accessibility report following the format specified in your system prompt. Identify patterns, prioritize issues, and provide actionable recommendations.`;

  const messages = [new HumanMessage(prompt)];
  const invokeResult = await agent.invoke(
    { messages },
    {
      recursionLimit: 26,
      signal: AbortSignal.timeout(90000),
    },
  );

  const lastMessage = invokeResult.messages[invokeResult.messages.length - 1];
  return String(lastMessage.content);
}

// ✅ OPTIMIZED: Use batch scanning instead of sequential Promise.all
export async function runMultiAgentScan(
  mainUrl: string,
): Promise<MultiAgentScanResult> {
  const discoveryResult = await runDiscoveryAgent(mainUrl);

  const urlsToScan = discoveryResult.discoveredUrls
    .slice(0, 4)
    .map((u) => u.url);

  const pageScanResults = await runPageScannerAgentBatch(urlsToScan);

  const finalReport = await runSummarizerAgent(
    discoveryResult,
    pageScanResults,
  );

  const totalViolations = pageScanResults.reduce(
    (sum, scan) => sum + scan.violations,
    0,
  );

  return {
    mainUrl,
    discoveryResult,
    pageScanResults,
    finalReport,
    totalViolations,
    timestamp: new Date().toISOString(),
  };
}

function parseDiscoveryResult(rawOutput: string): UrlDiscoveryResult {
  const timestamp = new Date().toISOString();

  const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonString = jsonMatch ? jsonMatch[1] : rawOutput;

  const parsed = JSON.parse(jsonString.trim());

  if (!parsed.mainPageUrl || !parsed.discoveredUrls) {
    return {
      mainPageUrl: "",
      mainPageHtml: "",
      discoveredUrls: [],
      timestamp,
    };
  }

  return {
    mainPageUrl: parsed.mainPageUrl,
    mainPageHtml: parsed.mainPageHtml || "",
    discoveredUrls: parsed.discoveredUrls,
    timestamp,
  };
}

function extractViolationCount(scanData: string): number {
  const match = scanData.match(/Total Violations[:\s]+(\d+)/i);
  if (match) {
    return Number.parseInt(match[1], 10);
  }

  const criticalCount = (scanData.match(/ðŸ"´/g) || []).length;
  const seriousCount = (scanData.match(/ðŸŸ /g) || []).length;
  const moderateCount = (scanData.match(/ðŸŸ¡/g) || []).length;
  const minorCount = (scanData.match(/ðŸ"µ/g) || []).length;

  return criticalCount + seriousCount + moderateCount + minorCount;
}
