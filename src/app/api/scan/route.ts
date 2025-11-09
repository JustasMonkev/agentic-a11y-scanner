import { HumanMessage } from "@langchain/core/messages";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { initializeAgent } from "@/lib/agent";
import { runMultiAgentScan } from "@/lib/multi-agent-orchestrator";
import type { ScanRequest } from "@/lib/types";
import { parseReportMetadata } from "@/lib/history-utils";

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json();
    const { url, mode } = body;

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: "Invalid URL provided" },
        { status: 400 },
      );
    }

    if (!mode || !["single", "exploration"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid scan mode. Must be 'single' or 'exploration'" },
        { status: 400 },
      );
    }

    const startTime = Date.now();
    console.log("🚀 Starting scan request...");

    if (mode === "exploration") {
      const result = await runMultiAgentScan(url);

      // Parse detailed metadata from the report
      const parsedMetadata = parseReportMetadata(result.finalReport, "exploration");

      return NextResponse.json({
        status: "success",
        data: result.finalReport,
        metadata: {
          multiAgent: true,
          pagesScanned: result.pageScanResults.length,
          totalViolations: result.totalViolations,
          discoveredUrls: result.discoveryResult.discoveredUrls.length,
          violationsBySeverity: parsedMetadata.violationsBySeverity,
          wcagLevel: parsedMetadata.wcagLevel,
        },
      });
    }

    const { agent } = await initializeAgent();

    const initTime = Date.now() - startTime;
    console.log(`⚡ Agent initialized in ${initTime}ms`);

    const scanPrompt = `Scan the following URL for accessibility violations: ${url}

Use the scan_url tool to scan this page. Analyze the results and report all violations found. Close the browser`;

    const messages = [new HumanMessage(scanPrompt)];
    const input = { messages };

    console.log("🔍 Invoking agent...");
    const scanStartTime = Date.now();

    const result = await agent.invoke(input, {
      recursionLimit: 200,
    });

    const scanTime = Date.now() - scanStartTime;
    console.log(`✅ Scan completed in ${scanTime}ms`);

    const lastMessage = result.messages[result.messages.length - 1];
    let finalOutput = "";
    if (lastMessage.content) {
      finalOutput = String(lastMessage.content);
    }

    const totalTime = Date.now() - startTime;
    console.log(`🏁 Total request time: ${totalTime}ms`);

    // Parse detailed metadata from the report
    const parsedMetadata = parseReportMetadata(finalOutput, "single");

    return NextResponse.json({
      status: "success",
      data: finalOutput,
      metadata: {
        initTime,
        scanTime,
        totalTime,
        multiAgent: false,
        pagesScanned: 1,
        totalViolations: parsedMetadata.totalViolations,
        violationsBySeverity: parsedMetadata.violationsBySeverity,
        wcagLevel: parsedMetadata.wcagLevel,
      },
    });
  } catch (error) {
    console.error("Scan API error:", error);
    return NextResponse.json(
      {
        error: "Failed to perform accessibility scan",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export const isValidUrl = (url: string) => URL.canParse(url);
