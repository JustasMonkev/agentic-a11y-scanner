export interface DiscoveredUrl {
  url: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export interface UrlDiscoveryResult {
  mainPageUrl: string;
  mainPageHtml: string;
  discoveredUrls: DiscoveredUrl[];
  timestamp: string;
}

export interface PageScanResult {
  url: string;
  scanData: string;
  violations: number;
  timestamp: string;
}

export interface MultiAgentScanResult {
  mainUrl: string;
  discoveryResult: UrlDiscoveryResult;
  pageScanResults: PageScanResult[];
  finalReport: string;
  totalViolations: number;
  timestamp: string;
}
