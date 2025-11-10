/**
 * Comparison Engine - Calculates diffs between scan reports
 */

import type {
  ScanComparison,
  ScanRecord,
  ViolationSeverity,
} from "./history-types";

/**
 * Compares two scan records and calculates the differences
 * @param baseline Earlier scan (baseline for comparison)
 * @param current Later scan (current state)
 * @returns Detailed comparison object
 */
export function compareScanRecords(
  baseline: ScanRecord,
  current: ScanRecord,
): ScanComparison {
  const baselineTotal = baseline.metadata.totalViolations;
  const currentTotal = current.metadata.totalViolations;

  // Calculate overall metrics
  const fixed = Math.max(0, baselineTotal - currentTotal);
  const newViolations = Math.max(0, currentTotal - baselineTotal);
  const unchanged = Math.min(baselineTotal, currentTotal);

  // Calculate percentage change (handle division by zero)
  let percentageChange = 0;
  if (baselineTotal > 0) {
    percentageChange = ((currentTotal - baselineTotal) / baselineTotal) * 100;
  } else if (currentTotal > 0) {
    percentageChange = 100; // From 0 to some violations = 100% increase
  }

  // Calculate per-severity breakdown
  const severities: ViolationSeverity[] = [
    "critical",
    "serious",
    "moderate",
    "minor",
  ];

  const bySeverity = {} as ScanComparison["bySeverity"];

  for (const severity of severities) {
    const baselineCount = baseline.metadata.violationsBySeverity[severity];
    const currentCount = current.metadata.violationsBySeverity[severity];

    bySeverity[severity] = {
      baselineCount,
      currentCount,
      fixed: Math.max(0, baselineCount - currentCount),
      new: Math.max(0, currentCount - baselineCount),
      unchanged: Math.min(baselineCount, currentCount),
    };
  }

  return {
    baseline,
    current,
    overall: {
      baselineTotal,
      currentTotal,
      fixed,
      new: newViolations,
      unchanged,
      percentageChange: Math.round(percentageChange * 10) / 10, // Round to 1 decimal
    },
    bySeverity,
    comparedAt: new Date().toISOString(),
  };
}

/**
 * Determines if a comparison shows improvement
 * @param comparison Comparison result
 * @returns True if current scan is better than baseline
 */
export function isImprovement(comparison: ScanComparison): boolean {
  return comparison.overall.currentTotal < comparison.overall.baselineTotal;
}

/**
 * Determines if a comparison shows regression
 * @param comparison Comparison result
 * @returns True if current scan is worse than baseline
 */
export function isRegression(comparison: ScanComparison): boolean {
  return comparison.overall.currentTotal > comparison.overall.baselineTotal;
}

/**
 * Gets a summary label for comparison
 * @param comparison Comparison result
 * @returns Human-readable summary
 */
export function getComparisonSummary(comparison: ScanComparison): string {
  const { overall, bySeverity } = comparison;

  if (overall.currentTotal === 0 && overall.baselineTotal === 0) {
    return "Both scans have no violations";
  }

  if (overall.currentTotal === 0) {
    return `All ${overall.baselineTotal} violations fixed!`;
  }

  if (overall.baselineTotal === 0) {
    return `${overall.currentTotal} new violations detected`;
  }

  if (overall.currentTotal === overall.baselineTotal) {
    return "No change in violation count";
  }

  // Check for mixed changes (some categories improved, some regressed)
  const severities: Array<"critical" | "serious" | "moderate" | "minor"> = [
    "critical",
    "serious",
    "moderate",
    "minor",
  ];

  let hasImprovements = false;
  let hasRegressions = false;

  for (const severity of severities) {
    if (bySeverity[severity].fixed > 0) hasImprovements = true;
    if (bySeverity[severity].new > 0) hasRegressions = true;
  }

  if (hasImprovements && hasRegressions) {
    return `${overall.fixed} fixed, ${overall.new} new`;
  }

  if (overall.fixed > 0 && overall.new === 0) {
    return `${overall.fixed} violations fixed`;
  }

  if (overall.new > 0 && overall.fixed === 0) {
    return `${overall.new} new violations`;
  }

  return `${overall.fixed} fixed, ${overall.new} new`;
}

/**
 * Gets the most significant change by severity
 * @param comparison Comparison result
 * @returns Severity with most significant change
 */
export function getMostSignificantChange(
  comparison: ScanComparison,
): ViolationSeverity | null {
  const severities: ViolationSeverity[] = [
    "critical",
    "serious",
    "moderate",
    "minor",
  ];

  let maxChange = 0;
  let maxSeverity: ViolationSeverity | null = null;

  for (const severity of severities) {
    const data = comparison.bySeverity[severity];
    const change = Math.abs(data.currentCount - data.baselineCount);

    if (change > maxChange) {
      maxChange = change;
      maxSeverity = severity;
    }
  }

  return maxSeverity;
}

/**
 * Calculates a quality score for a scan (0-100)
 * Lower violations = higher score
 * Critical violations weighted more heavily
 * @param record Scan record
 * @returns Quality score (0-100)
 */
export function calculateQualityScore(record: ScanRecord): number {
  const { violationsBySeverity } = record.metadata;

  // Weighted deductions (out of 100)
  const criticalWeight = 10; // Each critical violation = -10 points
  const seriousWeight = 5; // Each serious violation = -5 points
  const moderateWeight = 2; // Each moderate violation = -2 points
  const minorWeight = 1; // Each minor violation = -1 point

  const deductions =
    violationsBySeverity.critical * criticalWeight +
    violationsBySeverity.serious * seriousWeight +
    violationsBySeverity.moderate * moderateWeight +
    violationsBySeverity.minor * minorWeight;

  const score = Math.max(0, 100 - deductions);
  return Math.round(score);
}

/**
 * Compares quality scores between two scans
 * @param baseline Earlier scan
 * @param current Later scan
 * @returns Score difference (positive = improvement)
 */
export function compareQualityScores(
  baseline: ScanRecord,
  current: ScanRecord,
): number {
  const baselineScore = calculateQualityScore(baseline);
  const currentScore = calculateQualityScore(current);
  return currentScore - baselineScore;
}

/**
 * Formats a percentage change with sign and color indication
 * @param percentageChange Percentage change value
 * @returns Formatted string
 */
export function formatPercentageChange(percentageChange: number): string {
  if (percentageChange === 0) {
    return "0%";
  }

  const sign = percentageChange > 0 ? "+" : "";
  return `${sign}${percentageChange.toFixed(1)}%`;
}

/**
 * Gets a trend direction indicator
 * @param percentageChange Percentage change value
 * @returns Trend indicator (↑, ↓, →)
 */
export function getTrendIndicator(percentageChange: number): "↑" | "↓" | "→" {
  if (percentageChange > 0) return "↑";
  if (percentageChange < 0) return "↓";
  return "→";
}

/**
 * Validates if two scans can be meaningfully compared
 * @param scan1 First scan
 * @param scan2 Second scan
 * @returns Validation result with warning message if applicable
 */
export function validateComparison(
  scan1: ScanRecord,
  scan2: ScanRecord,
): { valid: boolean; warning?: string } {
  // Allow comparison of different URLs (with warning)
  if (scan1.url !== scan2.url) {
    return {
      valid: true,
      warning: "Comparing scans from different URLs",
    };
  }

  // Allow comparison of different modes (with warning)
  if (scan1.mode !== scan2.mode) {
    return {
      valid: true,
      warning: "Comparing scans with different modes (single vs exploration)",
    };
  }

  // Same scan
  if (scan1.id === scan2.id) {
    return {
      valid: false,
      warning: "Cannot compare a scan with itself",
    };
  }

  return { valid: true };
}
