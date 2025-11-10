/**
 * Utility functions for scan history management
 */

import type { ScanMetadata, ViolationSeverity } from "./history-types";

/**
 * Generates a unique identifier using UUID v4 algorithm
 * @returns UUID v4 string
 */
export function generateScanId(): string {
  return crypto.randomUUID();
}

/**
 * Parses markdown report to extract violation metadata
 * @param report Markdown-formatted scan report
 * @param mode Scan mode used
 * @returns Extracted metadata
 */
export function parseReportMetadata(
  report: string,
  mode: "single" | "exploration",
): ScanMetadata {
  const metadata: ScanMetadata = {
    totalViolations: 0,
    violationsBySeverity: {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
    },
    pageCount: mode === "single" ? 1 : 0,
  };

  // First, try to extract total violations directly
  const totalPatterns = [
    /\*\*Total Violations Found:\*\*\s*(\d+)/i,
    /\*\*Total Violations:\*\*\s*(\d+)/i,
    /Total Violations Found:\s*(\d+)/i,
    /Total Violations:\s*(\d+)/i,
  ];

  let totalFromReport = 0;
  for (const pattern of totalPatterns) {
    const match = report.match(pattern);
    if (match?.[1]) {
      const count = Number.parseInt(match[1], 10);
      if (!Number.isNaN(count)) {
        totalFromReport = count;
        break;
      }
    }
  }

  // Extract violation counts by severity
  // Pattern: 🔴 Critical: N violations
  // Pattern: 🟠 Serious: N violations
  // Pattern: 🟡 Moderate: N violations
  // Pattern: 🔵 Minor: N violations

  const severityPatterns: Record<ViolationSeverity, RegExp[]> = {
    critical: [
      /🔴\s*Critical:?\s*(\d+)\s*violations?/gi,
      /Critical\s*Issues?:?\s*(\d+)/gi,
      /\*\*Critical\*\*:?\s*(\d+)/gi,
      /##\s*🔴\s*Critical\s*Issues?\s*\((\d+)\)/gi,
    ],
    serious: [
      /🟠\s*Serious:?\s*(\d+)\s*violations?/gi,
      /Serious\s*Issues?:?\s*(\d+)/gi,
      /\*\*Serious\*\*:?\s*(\d+)/gi,
      /##\s*🟠\s*Serious\s*Issues?\s*\((\d+)\)/gi,
    ],
    moderate: [
      /🟡\s*Moderate:?\s*(\d+)\s*violations?/gi,
      /Moderate\s*Issues?:?\s*(\d+)/gi,
      /\*\*Moderate\*\*:?\s*(\d+)/gi,
      /##\s*🟡\s*Moderate\s*Issues?\s*\((\d+)\)/gi,
    ],
    minor: [
      /🔵\s*Minor:?\s*(\d+)\s*violations?/gi,
      /Minor\s*Issues?:?\s*(\d+)/gi,
      /\*\*Minor\*\*:?\s*(\d+)/gi,
      /##\s*🔵\s*Minor\s*Issues?\s*\((\d+)\)/gi,
    ],
  };

  // Try each pattern for each severity
  for (const [severity, patterns] of Object.entries(severityPatterns)) {
    for (const pattern of patterns) {
      const matches = report.matchAll(pattern);
      for (const match of matches) {
        const count = Number.parseInt(match[1], 10);
        if (!Number.isNaN(count) && count > 0) {
          metadata.violationsBySeverity[severity as ViolationSeverity] =
            Math.max(
              metadata.violationsBySeverity[severity as ViolationSeverity],
              count,
            );
        }
      }
    }
  }

  // If patterns don't have counts, try counting individual issues under each section
  if (Object.values(metadata.violationsBySeverity).every((c) => c === 0)) {
    // Count issues by looking for section headers and counting ### entries
    const severitySections: Record<ViolationSeverity, RegExp> = {
      critical: /##\s*🔴\s*Critical\s*Issues?([\s\S]*?)(?=##|$)/i,
      serious: /##\s*🟠\s*Serious\s*Issues?([\s\S]*?)(?=##|$)/i,
      moderate: /##\s*🟡\s*Moderate\s*Issues?([\s\S]*?)(?=##|$)/i,
      minor: /##\s*🔵\s*Minor\s*Issues?([\s\S]*?)(?=##|$)/i,
    };

    for (const [severity, sectionPattern] of Object.entries(
      severitySections,
    )) {
      const match = report.match(sectionPattern);
      if (match?.[1]) {
        const content = match[1];
        // Count ### entries (individual issues)
        const issueCount = (content.match(/###\s+\d+\./g) || []).length;
        if (issueCount > 0) {
          metadata.violationsBySeverity[severity as ViolationSeverity] =
            issueCount;
        }
      }
    }
  }

  // Calculate total violations from severity breakdown
  const calculatedTotal = Object.values(
    metadata.violationsBySeverity,
  ).reduce((sum, count) => sum + count, 0);

  // Use the explicitly stated total if available and greater, otherwise use calculated
  metadata.totalViolations = Math.max(totalFromReport, calculatedTotal);

  // Try to extract page count for exploration mode
  if (mode === "exploration") {
    const pagePatterns = [
      /scanned\s+(\d+)\s+pages?/i,
      /(\d+)\s+pages?\s+scanned/i,
      /total\s+pages?:?\s*(\d+)/i,
    ];

    for (const pattern of pagePatterns) {
      const match = report.match(pattern);
      if (match?.[1]) {
        const count = Number.parseInt(match[1], 10);
        if (!Number.isNaN(count) && count > 0) {
          metadata.pageCount = count;
          break;
        }
      }
    }
  }

  // Try to extract WCAG level
  const wcagPatterns = [
    /WCAG\s+(AAA|AA|A)\s+complian[ct]/i,
    /meets\s+WCAG\s+(AAA|AA|A)/i,
    /level\s+(AAA|AA|A)\s+complian[ct]/i,
  ];

  for (const pattern of wcagPatterns) {
    const match = report.match(pattern);
    if (match?.[1]) {
      metadata.wcagLevel = match[1].toUpperCase() as "A" | "AA" | "AAA";
      break;
    }
  }

  return metadata;
}

/**
 * Formats a date as a human-readable relative time
 * @param isoString ISO 8601 timestamp
 * @returns Human-readable string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);

    // Check if date is valid
    if (Number.isNaN(date.getTime())) {
      return "unknown";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return "just now";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    }
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? "month" : "months"} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  } catch {
    return "unknown";
  }
}

/**
 * Formats a date as a full date string
 * @param isoString ISO 8601 timestamp
 * @returns Formatted date string (e.g., "Dec 15, 2023 at 3:45 PM")
 */
export function formatFullDate(isoString: string): string {
  try {
    const date = new Date(isoString);

    // Check if date is valid
    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Invalid date";
  }
}

/**
 * Formats a duration in milliseconds as a human-readable string
 * @param ms Duration in milliseconds
 * @returns Formatted string (e.g., "2m 30s", "45s")
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

/**
 * Truncates a URL for display
 * @param url Full URL
 * @param maxLength Maximum length
 * @returns Truncated URL
 */
export function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;

    if (domain.length > maxLength - 3) {
      return `${domain.slice(0, maxLength - 3)}...`;
    }

    const remainingLength = maxLength - domain.length - 3; // -3 for "..."
    if (path.length > remainingLength) {
      return `${domain}${path.slice(0, remainingLength)}...`;
    }

    return url;
  } catch {
    // If URL parsing fails, just truncate the string
    return `${url.slice(0, maxLength - 3)}...`;
  }
}

/**
 * Estimates the size of an object in bytes (for localStorage quota management)
 * @param obj Object to measure
 * @returns Estimated size in bytes
 */
export function estimateObjectSize(obj: unknown): number {
  // Each character is approximately 2 bytes in UTF-16
  return JSON.stringify(obj).length * 2;
}

/**
 * Sanitizes user input for labels
 * @param input User input
 * @returns Sanitized string
 */
export function sanitizeLabel(input: string): string {
  return input.trim().slice(0, 100);
}
