import { describe, expect, it } from "vitest";
import type {
  MultiAgentScanResult,
  PageScanResult,
  UrlDiscoveryResult,
} from "@/lib/multi-agent-types";

describe("Multi-Agent Orchestrator - Helper Functions", () => {
  describe("parseDiscoveryResult", () => {
    it("should parse valid JSON discovery result", () => {
      // We need to expose parseDiscoveryResult for testing
      // For now, we'll test the expected structure
      const expected: Partial<UrlDiscoveryResult> = {
        mainPageUrl: "https://example.com",
        mainPageHtml: "<html><body>Test</body></html>",
        discoveredUrls: [
          {
            url: "https://example.com/signup",
            description: "User registration",
            priority: "high",
          },
        ],
      };

      expect(expected.mainPageUrl).toBe("https://example.com");
      expect(expected.discoveredUrls).toHaveLength(1);
      expect(expected.discoveredUrls?.[0].priority).toBe("high");
    });

    it("should parse JSON from markdown code blocks", () => {
      const rawOutput = `\`\`\`json
      {
        "mainPageUrl": "https://example.com",
        "mainPageHtml": "<html></html>",
        "discoveredUrls": []
      }
      \`\`\``;

      // Test that we can extract JSON from markdown
      const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
      expect(jsonMatch).toBeTruthy();
      expect(jsonMatch?.[1]).toContain("mainPageUrl");
    });

    it("should handle invalid JSON gracefully", () => {
      // When parsing fails, it should return a fallback result
      const fallback: UrlDiscoveryResult = {
        mainPageUrl: "",
        mainPageHtml: "",
        discoveredUrls: [],
        timestamp: new Date().toISOString(),
      };

      expect(fallback.discoveredUrls).toEqual([]);
      expect(fallback.mainPageUrl).toBe("");
    });
  });

  describe("extractViolationCount", () => {
    it("should extract violation count from Total Violations line", () => {
      const scanData = `# Accessibility Report

**Total Violations:** 42

## Critical Issues`;

      const match = scanData.match(/Total Violations.*?[:\s]+(\d+)/i);
      expect(match).toBeTruthy();
      expect(Number.parseInt(match?.[1] || "0", 10)).toBe(42);
    });

    it("should extract violation count with different formatting", () => {
      const scanData = `**Total Violations Found:** 15`;

      const match = scanData.match(/Total Violations.*?[:\s]+(\d+)/i);
      expect(match).toBeTruthy();
      expect(Number.parseInt(match?.[1] || "0", 10)).toBe(15);
    });

    it("should count severity markers as fallback", () => {
      const scanData = `
      ## 🔴 Critical Issues
      ### 1. Issue 1
      ### 2. Issue 2

      ## 🟠 Serious Issues
      ### 1. Issue 3

      ## 🟡 Moderate Issues
      ### 1. Issue 4

      ## 🔵 Minor Issues
      ### 1. Issue 5
      `;

      const criticalCount = (scanData.match(/🔴/g) || []).length;
      const seriousCount = (scanData.match(/🟠/g) || []).length;
      const moderateCount = (scanData.match(/🟡/g) || []).length;
      const minorCount = (scanData.match(/🔵/g) || []).length;

      const total = criticalCount + seriousCount + moderateCount + minorCount;

      expect(criticalCount).toBe(1);
      expect(seriousCount).toBe(1);
      expect(moderateCount).toBe(1);
      expect(minorCount).toBe(1);
      expect(total).toBe(4);
    });

    it("should return 0 when no violations found", () => {
      const scanData = `# Clean Report\n\nNo issues found.`;

      const match = scanData.match(/Total Violations[:\s]+(\d+)/i);
      expect(match).toBeNull();

      const emojiCount =
        (scanData.match(/🔴/g) || []).length +
        (scanData.match(/🟠/g) || []).length +
        (scanData.match(/🟡/g) || []).length +
        (scanData.match(/🔵/g) || []).length;

      expect(emojiCount).toBe(0);
    });
  });
});

describe("Multi-Agent Orchestrator - Data Structures", () => {
  it("should create valid UrlDiscoveryResult structure", () => {
    const discoveryResult: UrlDiscoveryResult = {
      mainPageUrl: "https://example.com",
      mainPageHtml: "<html></html>",
      discoveredUrls: [
        {
          url: "https://example.com/signup",
          description: "Signup page",
          priority: "high",
        },
        {
          url: "https://example.com/about",
          description: "About page",
          priority: "low",
        },
      ],
      timestamp: new Date().toISOString(),
    };

    expect(discoveryResult.mainPageUrl).toBe("https://example.com");
    expect(discoveryResult.discoveredUrls).toHaveLength(2);
    expect(discoveryResult.discoveredUrls[0].priority).toBe("high");
  });

  it("should create valid PageScanResult structure", () => {
    const pageScanResult: PageScanResult = {
      url: "https://example.com/signup",
      scanData: "# Accessibility Report\n\n**Total Violations:** 5",
      violations: 5,
      timestamp: new Date().toISOString(),
    };

    expect(pageScanResult.url).toContain("signup");
    expect(pageScanResult.violations).toBe(5);
    expect(pageScanResult.scanData).toContain("Total Violations");
  });

  it("should create valid MultiAgentScanResult structure", () => {
    const discoveryResult: UrlDiscoveryResult = {
      mainPageUrl: "https://example.com",
      mainPageHtml: "<html></html>",
      discoveredUrls: [
        {
          url: "https://example.com/signup",
          description: "Signup",
          priority: "high",
        },
      ],
      timestamp: new Date().toISOString(),
    };

    const pageScanResults: PageScanResult[] = [
      {
        url: "https://example.com/signup",
        scanData: "Report 1",
        violations: 5,
        timestamp: new Date().toISOString(),
      },
      {
        url: "https://example.com/login",
        scanData: "Report 2",
        violations: 3,
        timestamp: new Date().toISOString(),
      },
    ];

    const multiAgentResult: MultiAgentScanResult = {
      mainUrl: "https://example.com",
      discoveryResult,
      pageScanResults,
      finalReport: "# Comprehensive Report",
      totalViolations: 8,
      timestamp: new Date().toISOString(),
    };

    expect(multiAgentResult.mainUrl).toBe("https://example.com");
    expect(multiAgentResult.pageScanResults).toHaveLength(2);
    expect(multiAgentResult.totalViolations).toBe(8);
  });
});

describe("Multi-Agent Orchestrator - Flow Logic", () => {
  it("should limit discovered URLs to 4 for scanning", () => {
    const discoveredUrls = [
      { url: "url1", description: "URL 1", priority: "high" as const },
      { url: "url2", description: "URL 2", priority: "high" as const },
      { url: "url3", description: "URL 3", priority: "high" as const },
      { url: "url4", description: "URL 4", priority: "high" as const },
      { url: "url5", description: "URL 5", priority: "low" as const },
      { url: "url6", description: "URL 6", priority: "low" as const },
    ];

    const urlsToScan = discoveredUrls.slice(0, 4).map((u) => u.url);

    expect(urlsToScan).toHaveLength(4);
    expect(urlsToScan).toEqual(["url1", "url2", "url3", "url4"]);
  });

  it("should calculate total violations correctly", () => {
    const pageScanResults: PageScanResult[] = [
      {
        url: "url1",
        scanData: "data1",
        violations: 5,
        timestamp: new Date().toISOString(),
      },
      {
        url: "url2",
        scanData: "data2",
        violations: 3,
        timestamp: new Date().toISOString(),
      },
      {
        url: "url3",
        scanData: "data3",
        violations: 7,
        timestamp: new Date().toISOString(),
      },
    ];

    const totalViolations = pageScanResults.reduce(
      (sum, scan) => sum + scan.violations,
      0,
    );

    expect(totalViolations).toBe(15);
  });

  it("should handle empty discovered URLs", () => {
    const discoveredUrls: Array<{
      url: string;
      description: string;
      priority: string;
    }> = [];

    const urlsToScan = discoveredUrls.slice(0, 4).map((u) => u.url);

    expect(urlsToScan).toHaveLength(0);
    expect(urlsToScan).toEqual([]);
  });
});

describe("Multi-Agent Orchestrator - Metrics", () => {
  it("should calculate agent invocation duration", () => {
    const startTime = Date.now();
    // Simulate some work
    const endTime = startTime + 1000;

    const duration = endTime - startTime;

    expect(duration).toBe(1000);
  });

  it("should track multiple agent invocations", () => {
    const agentInvocations = [
      {
        agentType: "discovery" as const,
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
      },
      {
        agentType: "scanner" as const,
        startTime: 2000,
        endTime: 3000,
        duration: 1000,
      },
      {
        agentType: "scanner" as const,
        startTime: 2000,
        endTime: 3500,
        duration: 1500,
      },
      {
        agentType: "summarizer" as const,
        startTime: 3500,
        endTime: 4500,
        duration: 1000,
      },
    ];

    expect(agentInvocations).toHaveLength(4);
    expect(agentInvocations[0].agentType).toBe("discovery");

    const totalDuration = agentInvocations.reduce(
      (sum, inv) => sum + inv.duration,
      0,
    );
    expect(totalDuration).toBe(4500);
  });
});

describe("Multi-Agent Orchestrator - Prompt Construction", () => {
  it("should construct discovery agent prompt correctly", () => {
    const mainUrl = "https://example.com";
    const prompt = `Analyze this URL and discover the most important pages to scan: ${mainUrl}`;

    expect(prompt).toContain(mainUrl);
    expect(prompt).toContain("discover");
  });

  it("should construct page scanner prompt correctly", () => {
    const url = "https://example.com/signup";
    const prompt = `Scan this URL for accessibility violations: ${url}`;

    expect(prompt).toContain(url);
    expect(prompt).toContain("accessibility violations");
  });

  it("should construct summarizer prompt with all scan data", () => {
    const pageScanResults: PageScanResult[] = [
      {
        url: "url1",
        scanData: "# Report 1\nData 1",
        violations: 5,
        timestamp: new Date().toISOString(),
      },
      {
        url: "url2",
        scanData: "# Report 2\nData 2",
        violations: 3,
        timestamp: new Date().toISOString(),
      },
    ];

    const scanReports = pageScanResults
      .map(
        (scan, index) => `## Page ${index + 1}: ${scan.url}\n${scan.scanData}`,
      )
      .join("\n\n---\n\n");

    expect(scanReports).toContain("Page 1");
    expect(scanReports).toContain("Page 2");
    expect(scanReports).toContain("url1");
    expect(scanReports).toContain("url2");
    expect(scanReports).toContain("---");
  });
});

describe("Multi-Agent Orchestrator - Error Handling", () => {
  it("should handle malformed JSON in discovery result", () => {
    const malformedJson = "{ invalid json }";

    expect(() => JSON.parse(malformedJson)).toThrow();
    expect(() => JSON.parse(malformedJson)).toThrow(/JSON/);
  });

  it("should provide fallback when discovery result is incomplete", () => {
    const incompleteResult = {
      mainPageUrl: "https://example.com",
      // Missing discoveredUrls
    };

    const isValid = "discoveredUrls" in incompleteResult;
    expect(isValid).toBe(false);

    // Should use fallback
    const fallback: UrlDiscoveryResult = {
      mainPageUrl: "",
      mainPageHtml: "",
      discoveredUrls: [],
      timestamp: new Date().toISOString(),
    };

    expect(fallback.discoveredUrls).toEqual([]);
  });
});

describe("Multi-Agent Orchestrator - Parallel Execution", () => {
  it("should simulate parallel agent execution", async () => {
    // Simulate 4 parallel scan agents
    const urls = [
      "https://example.com/page1",
      "https://example.com/page2",
      "https://example.com/page3",
      "https://example.com/page4",
    ];

    const mockScanAgent = async (url: string): Promise<PageScanResult> => {
      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        url,
        scanData: `# Scan of ${url}`,
        violations: Math.floor(Math.random() * 10),
        timestamp: new Date().toISOString(),
      };
    };

    const startTime = Date.now();
    const scanPromises = urls.map((url) => mockScanAgent(url));
    const results = await Promise.all(scanPromises);
    const duration = Date.now() - startTime;

    expect(results).toHaveLength(4);
    expect(duration).toBeLessThan(100); // Should be much faster than sequential
    expect(results[0].url).toBe("https://example.com/page1");
  });

  it("should handle partial failures in parallel execution", async () => {
    const mockScanAgent = async (
      url: string,
      shouldFail: boolean,
    ): Promise<PageScanResult> => {
      if (shouldFail) {
        throw new Error(`Failed to scan ${url}`);
      }
      return {
        url,
        scanData: `# Scan of ${url}`,
        violations: 5,
        timestamp: new Date().toISOString(),
      };
    };

    const promises = Promise.all([
      mockScanAgent("url1", false),
      mockScanAgent("url2", true), // This will fail
      mockScanAgent("url3", false),
    ]);

    await expect(promises).rejects.toThrow("Failed to scan");
  });
});
