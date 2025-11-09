export interface ScanRequest {
  url: string;
  mode: "single" | "exploration";
}

export interface ScanResponseMetadata {
  /** Duration metrics */
  initTime?: number;
  scanTime?: number;
  totalTime?: number;
  /** Multi-agent scan metadata */
  multiAgent: boolean;
  pagesScanned?: number;
  totalViolations?: number;
  discoveredUrls?: number;
  /** Violations by severity (extracted from report) */
  violationsBySeverity?: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  /** WCAG level achieved */
  wcagLevel?: "A" | "AA" | "AAA" | "none";
}

export interface ScanResponse {
  status: "success" | "error" | "in_progress";
  data: string;
  error?: string;
  metadata?: ScanResponseMetadata;
}
