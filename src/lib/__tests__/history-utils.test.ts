import { describe, expect, it } from "vitest";
import {
	formatDuration,
	formatFullDate,
	formatRelativeTime,
	generateScanId,
	parseReportMetadata,
	truncateUrl,
} from "../history-utils";

describe("generateScanId", () => {
	it("should generate a valid UUID v4 format", () => {
		const id = generateScanId();
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		expect(id).toMatch(uuidRegex);
	});

	it("should generate unique IDs", () => {
		const ids = new Set();
		for (let i = 0; i < 100; i++) {
			ids.add(generateScanId());
		}
		expect(ids.size).toBe(100);
	});
});

describe("parseReportMetadata", () => {
	it("should parse violations with emoji markers", () => {
		const report = `
# Accessibility Report

## Violations Found

🔴 Critical: 5 violations
🟠 Serious: 10 violations
🟡 Moderate: 3 violations
🔵 Minor: 2 violations
    `;

		const metadata = parseReportMetadata(report, "single");
		expect(metadata.violationsBySeverity.critical).toBe(5);
		expect(metadata.violationsBySeverity.serious).toBe(10);
		expect(metadata.violationsBySeverity.moderate).toBe(3);
		expect(metadata.violationsBySeverity.minor).toBe(2);
		expect(metadata.totalViolations).toBe(20);
		expect(metadata.pageCount).toBe(1);
	});

	it("should parse violations without emoji markers", () => {
		const report = `
# Report

Critical Issues: 3
Serious Issues: 7
Moderate Issues: 1
Minor Issues: 4
    `;

		const metadata = parseReportMetadata(report, "single");
		expect(metadata.violationsBySeverity.critical).toBe(3);
		expect(metadata.violationsBySeverity.serious).toBe(7);
		expect(metadata.violationsBySeverity.moderate).toBe(1);
		expect(metadata.violationsBySeverity.minor).toBe(4);
		expect(metadata.totalViolations).toBe(15);
	});

	it("should handle reports with zero violations", () => {
		const report = `
# Clean Report

🔴 Critical: 0 violations
🟠 Serious: 0 violations
🟡 Moderate: 0 violations
🔵 Minor: 0 violations

No issues found!
    `;

		const metadata = parseReportMetadata(report, "single");
		expect(metadata.totalViolations).toBe(0);
		expect(metadata.violationsBySeverity.critical).toBe(0);
	});

	it("should handle malformed reports gracefully", () => {
		const report = "This is not a valid report format";
		const metadata = parseReportMetadata(report, "single");
		expect(metadata.totalViolations).toBe(0);
		expect(metadata.pageCount).toBe(1);
	});

	it("should extract page count for exploration mode", () => {
		const report = `
# Multi-Page Scan

Scanned 4 pages across the website.

Total violations found: 25
    `;

		const metadata = parseReportMetadata(report, "exploration");
		expect(metadata.pageCount).toBe(4);
	});

	it("should extract WCAG level", () => {
		const report = `
# Report

Meets WCAG AA compliance.

🔴 Critical: 0 violations
    `;

		const metadata = parseReportMetadata(report, "single");
		expect(metadata.wcagLevel).toBe("AA");
	});

	it("should handle missing sections", () => {
		const report = `
# Partial Report

🔴 Critical: 2 violations
    `;

		const metadata = parseReportMetadata(report, "single");
		expect(metadata.violationsBySeverity.critical).toBe(2);
		expect(metadata.violationsBySeverity.serious).toBe(0);
		expect(metadata.violationsBySeverity.moderate).toBe(0);
		expect(metadata.violationsBySeverity.minor).toBe(0);
		expect(metadata.totalViolations).toBe(2);
	});

	it("should handle alternative formatting", () => {
		const report = `
**Critical**: 8
**Serious**: 4
**Moderate**: 2
**Minor**: 1
    `;

		const metadata = parseReportMetadata(report, "single");
		expect(metadata.violationsBySeverity.critical).toBe(8);
		expect(metadata.totalViolations).toBe(15);
	});
});

describe("formatRelativeTime", () => {
	it("should format recent times", () => {
		const now = new Date();
		const justNow = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
		expect(formatRelativeTime(justNow.toISOString())).toBe("just now");
	});

	it("should format minutes", () => {
		const now = new Date();
		const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
		expect(formatRelativeTime(fiveMinutesAgo.toISOString())).toBe(
			"5 minutes ago",
		);
	});

	it("should format hours", () => {
		const now = new Date();
		const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
		expect(formatRelativeTime(twoHoursAgo.toISOString())).toBe("2 hours ago");
	});

	it("should format days", () => {
		const now = new Date();
		const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
		expect(formatRelativeTime(threeDaysAgo.toISOString())).toBe("3 days ago");
	});

	it("should handle invalid dates", () => {
		expect(formatRelativeTime("invalid-date")).toBe("unknown");
	});

	it("should use singular forms for 1 unit", () => {
		const now = new Date();
		const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
		expect(formatRelativeTime(oneMinuteAgo.toISOString())).toBe("1 minute ago");
	});
});

describe("formatFullDate", () => {
	it("should format date correctly", () => {
		const date = "2023-12-15T15:45:00Z";
		const formatted = formatFullDate(date);
		expect(formatted).toContain("Dec");
		expect(formatted).toContain("15");
		expect(formatted).toContain("2023");
	});

	it("should handle invalid dates", () => {
		expect(formatFullDate("invalid-date")).toBe("Invalid date");
	});
});

describe("formatDuration", () => {
	it("should format seconds only", () => {
		expect(formatDuration(45000)).toBe("45s");
	});

	it("should format minutes and seconds", () => {
		expect(formatDuration(150000)).toBe("2m 30s");
	});

	it("should handle zero", () => {
		expect(formatDuration(0)).toBe("0s");
	});
});

describe("truncateUrl", () => {
	it("should not truncate short URLs", () => {
		const url = "https://example.com";
		expect(truncateUrl(url, 50)).toBe(url);
	});

	it("should truncate long URLs", () => {
		const url =
			"https://example.com/very/long/path/that/exceeds/the/maximum/length";
		const truncated = truncateUrl(url, 30);
		expect(truncated.length).toBeLessThanOrEqual(33); // 30 + "..."
		expect(truncated).toContain("...");
	});

	it("should handle URLs with just domain", () => {
		const url =
			"https://verylongdomainname.example.com/path/to/resource/that/is/long";
		const truncated = truncateUrl(url, 30);
		expect(truncated).toContain("...");
	});

	it("should handle invalid URLs", () => {
		const invalid = "not a valid url but very very very long string";
		const truncated = truncateUrl(invalid, 20);
		expect(truncated.length).toBeLessThanOrEqual(23);
	});
});
