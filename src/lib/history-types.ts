/**
 * TypeScript interfaces for scan history and comparison features
 * Supports localStorage-based persistence with versioning
 */

/**
 * Severity levels for accessibility violations
 */
export type ViolationSeverity = "critical" | "serious" | "moderate" | "minor";

/**
 * Metadata extracted from markdown scan reports
 */
export interface ScanMetadata {
  /** Total number of violations across all severities */
  totalViolations: number;
  /** Breakdown by severity level */
  violationsBySeverity: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  /** Number of pages scanned (1 for single mode, multiple for exploration) */
  pageCount: number;
  /** WCAG compliance level achieved */
  wcagLevel?: "A" | "AA" | "AAA" | "none";
  /** Duration of the scan in milliseconds */
  scanDuration?: number;
}

/**
 * Individual scan record stored in history
 */
export interface ScanRecord {
  /** Unique identifier (UUID v4) */
  id: string;
  /** URL that was scanned */
  url: string;
  /** Scan mode used */
  mode: "single" | "exploration";
  /** ISO 8601 timestamp when scan was performed */
  timestamp: string;
  /** Full markdown report from the scan */
  report: string;
  /** Extracted metadata from the report */
  metadata: ScanMetadata;
  /** Optional user-provided label/note */
  label?: string;
  /** List of discovered URLs (for exploration mode) */
  discoveredUrls?: string[];
}

/**
 * Root storage object with versioning
 */
export interface ScanHistory {
  /** Schema version for migrations */
  version: number;
  /** Array of scan records (most recent first) */
  scans: ScanRecord[];
  /** Timestamp of last modification */
  lastModified: string;
}

/**
 * Comparison result between two scans
 */
export interface ScanComparison {
  /** Earlier scan (baseline) */
  baseline: ScanRecord;
  /** Later scan (current) */
  current: ScanRecord;
  /** Overall metrics */
  overall: {
    /** Total violations in baseline */
    baselineTotal: number;
    /** Total violations in current */
    currentTotal: number;
    /** Number of fixed violations */
    fixed: number;
    /** Number of new violations */
    new: number;
    /** Number of unchanged violations */
    unchanged: number;
    /** Percentage change ((current - baseline) / baseline * 100) */
    percentageChange: number;
  };
  /** Breakdown by severity */
  bySeverity: {
    [K in ViolationSeverity]: {
      baselineCount: number;
      currentCount: number;
      fixed: number;
      new: number;
      unchanged: number;
    };
  };
  /** Timestamp when comparison was performed */
  comparedAt: string;
}

/**
 * Filter options for scan history
 */
export interface HistoryFilter {
  /** Filter by URL (partial match) */
  url?: string;
  /** Filter by scan mode */
  mode?: "single" | "exploration";
  /** Filter by date range (ISO 8601) */
  dateFrom?: string;
  dateTo?: string;
  /** Filter by minimum violations */
  minViolations?: number;
  /** Filter by maximum violations */
  maxViolations?: number;
}

/**
 * Storage operation result
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  /** Current storage usage in bytes */
  used: number;
  /** Maximum available storage in bytes */
  limit: number;
  /** Percentage of storage used (0-100) */
  percentageUsed: number;
  /** Number of scans stored */
  scanCount: number;
}
