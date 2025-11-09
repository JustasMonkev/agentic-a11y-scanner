import { describe, expect, it } from "vitest";
import type { ScanRecord } from "../history-types";
import {
	calculateQualityScore,
	compareQualityScores,
	compareScanRecords,
	formatPercentageChange,
	getComparisonSummary,
	getMostSignificantChange,
	getTrendIndicator,
	isImprovement,
	isRegression,
	validateComparison,
} from "../comparison-engine";

// Helper function to create mock scan records
function createMockScan(
	id: string,
	url: string,
	violations: {
		critical: number;
		serious: number;
		moderate: number;
		minor: number;
	},
): ScanRecord {
	const total =
		violations.critical +
		violations.serious +
		violations.moderate +
		violations.minor;

	return {
		id,
		url,
		mode: "single",
		timestamp: new Date().toISOString(),
		report: "Mock report",
		metadata: {
			totalViolations: total,
			violationsBySeverity: violations,
			pageCount: 1,
		},
	};
}

describe("compareScanRecords", () => {
	it("should calculate improvement correctly", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 10,
			moderate: 3,
			minor: 2,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 2,
			serious: 5,
			moderate: 1,
			minor: 1,
		});

		const comparison = compareScanRecords(baseline, current);

		expect(comparison.overall.baselineTotal).toBe(20);
		expect(comparison.overall.currentTotal).toBe(9);
		expect(comparison.overall.fixed).toBe(11);
		expect(comparison.overall.new).toBe(0);
		expect(comparison.overall.percentageChange).toBe(-55);
	});

	it("should calculate regression correctly", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 2,
			serious: 3,
			moderate: 1,
			minor: 1,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 5,
			serious: 8,
			moderate: 4,
			minor: 3,
		});

		const comparison = compareScanRecords(baseline, current);

		expect(comparison.overall.baselineTotal).toBe(7);
		expect(comparison.overall.currentTotal).toBe(20);
		expect(comparison.overall.fixed).toBe(0);
		expect(comparison.overall.new).toBe(13);
		expect(comparison.overall.percentageChange).toBeCloseTo(185.7, 1);
	});

	it("should handle zero violations in baseline", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 0,
			serious: 0,
			moderate: 0,
			minor: 0,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 3,
			serious: 2,
			moderate: 1,
			minor: 0,
		});

		const comparison = compareScanRecords(baseline, current);

		expect(comparison.overall.baselineTotal).toBe(0);
		expect(comparison.overall.currentTotal).toBe(6);
		expect(comparison.overall.percentageChange).toBe(100);
	});

	it("should handle zero violations in current", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 3,
			moderate: 2,
			minor: 1,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 0,
			serious: 0,
			moderate: 0,
			minor: 0,
		});

		const comparison = compareScanRecords(baseline, current);

		expect(comparison.overall.fixed).toBe(11);
		expect(comparison.overall.percentageChange).toBe(-100);
	});

	it("should calculate per-severity breakdown", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 10,
			moderate: 3,
			minor: 2,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 2,
			serious: 12,
			moderate: 1,
			minor: 3,
		});

		const comparison = compareScanRecords(baseline, current);

		expect(comparison.bySeverity.critical.fixed).toBe(3);
		expect(comparison.bySeverity.serious.new).toBe(2);
		expect(comparison.bySeverity.moderate.fixed).toBe(2);
		expect(comparison.bySeverity.minor.new).toBe(1);
	});
});

describe("isImprovement", () => {
	it("should return true for improvement", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 5,
			moderate: 5,
			minor: 5,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 2,
			serious: 2,
			moderate: 2,
			minor: 2,
		});

		const comparison = compareScanRecords(baseline, current);
		expect(isImprovement(comparison)).toBe(true);
	});

	it("should return false for regression", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 2,
			serious: 2,
			moderate: 2,
			minor: 2,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 5,
			serious: 5,
			moderate: 5,
			minor: 5,
		});

		const comparison = compareScanRecords(baseline, current);
		expect(isImprovement(comparison)).toBe(false);
	});
});

describe("isRegression", () => {
	it("should return true for regression", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 1,
			serious: 1,
			moderate: 1,
			minor: 1,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 3,
			serious: 3,
			moderate: 3,
			minor: 3,
		});

		const comparison = compareScanRecords(baseline, current);
		expect(isRegression(comparison)).toBe(true);
	});

	it("should return false for improvement", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 5,
			moderate: 5,
			minor: 5,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 1,
			serious: 1,
			moderate: 1,
			minor: 1,
		});

		const comparison = compareScanRecords(baseline, current);
		expect(isRegression(comparison)).toBe(false);
	});
});

describe("getComparisonSummary", () => {
	it("should summarize all violations fixed", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 5,
			moderate: 5,
			minor: 5,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 0,
			serious: 0,
			moderate: 0,
			minor: 0,
		});

		const comparison = compareScanRecords(baseline, current);
		expect(getComparisonSummary(comparison)).toBe("All 20 violations fixed!");
	});

	it("should summarize new violations", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 0,
			serious: 0,
			moderate: 0,
			minor: 0,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 3,
			serious: 2,
			moderate: 1,
			minor: 1,
		});

		const comparison = compareScanRecords(baseline, current);
		expect(getComparisonSummary(comparison)).toBe("7 new violations detected");
	});

	it("should summarize mixed changes", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 10,
			serious: 5,
			moderate: 3,
			minor: 2,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 5,
			serious: 8,
			moderate: 5,
			minor: 4,
		});

		const comparison = compareScanRecords(baseline, current);
		const summary = getComparisonSummary(comparison);
		expect(summary).toContain("fixed");
		expect(summary).toContain("new");
	});
});

describe("getMostSignificantChange", () => {
	it("should identify severity with most change", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 10,
			serious: 5,
			moderate: 3,
			minor: 2,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 2,
			serious: 4,
			moderate: 3,
			minor: 2,
		});

		const comparison = compareScanRecords(baseline, current);
		expect(getMostSignificantChange(comparison)).toBe("critical");
	});

	it("should return null when no changes", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 5,
			moderate: 5,
			minor: 5,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 5,
			serious: 5,
			moderate: 5,
			minor: 5,
		});

		const comparison = compareScanRecords(baseline, current);
		expect(getMostSignificantChange(comparison)).toBe(null);
	});
});

describe("calculateQualityScore", () => {
	it("should give perfect score for no violations", () => {
		const scan = createMockScan("1", "https://example.com", {
			critical: 0,
			serious: 0,
			moderate: 0,
			minor: 0,
		});

		expect(calculateQualityScore(scan)).toBe(100);
	});

	it("should penalize critical violations more heavily", () => {
		const scanWithCritical = createMockScan("1", "https://example.com", {
			critical: 1,
			serious: 0,
			moderate: 0,
			minor: 0,
		});

		const scanWithMinor = createMockScan("2", "https://example.com", {
			critical: 0,
			serious: 0,
			moderate: 0,
			minor: 10,
		});

		expect(calculateQualityScore(scanWithCritical)).toBe(90); // -10 for critical
		expect(calculateQualityScore(scanWithMinor)).toBe(90); // -10 for 10 minor
	});

	it("should not go below zero", () => {
		const scan = createMockScan("1", "https://example.com", {
			critical: 50,
			serious: 50,
			moderate: 50,
			minor: 50,
		});

		expect(calculateQualityScore(scan)).toBe(0);
	});
});

describe("compareQualityScores", () => {
	it("should return positive for improvement", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 10,
			serious: 10,
			moderate: 10,
			minor: 10,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 1,
			serious: 1,
			moderate: 1,
			minor: 1,
		});

		expect(compareQualityScores(baseline, current)).toBeGreaterThan(0);
	});

	it("should return negative for regression", () => {
		const baseline = createMockScan("1", "https://example.com", {
			critical: 1,
			serious: 1,
			moderate: 1,
			minor: 1,
		});

		const current = createMockScan("2", "https://example.com", {
			critical: 10,
			serious: 10,
			moderate: 10,
			minor: 10,
		});

		expect(compareQualityScores(baseline, current)).toBeLessThan(0);
	});
});

describe("formatPercentageChange", () => {
	it("should format positive change with plus sign", () => {
		expect(formatPercentageChange(25.5)).toBe("+25.5%");
	});

	it("should format negative change with minus sign", () => {
		expect(formatPercentageChange(-15.3)).toBe("-15.3%");
	});

	it("should format zero without sign", () => {
		expect(formatPercentageChange(0)).toBe("0%");
	});
});

describe("getTrendIndicator", () => {
	it("should return up arrow for positive change", () => {
		expect(getTrendIndicator(10)).toBe("↑");
	});

	it("should return down arrow for negative change", () => {
		expect(getTrendIndicator(-10)).toBe("↓");
	});

	it("should return right arrow for no change", () => {
		expect(getTrendIndicator(0)).toBe("→");
	});
});

describe("validateComparison", () => {
	it("should allow comparison of same URL", () => {
		const scan1 = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 5,
			moderate: 5,
			minor: 5,
		});

		const scan2 = createMockScan("2", "https://example.com", {
			critical: 3,
			serious: 3,
			moderate: 3,
			minor: 3,
		});

		const result = validateComparison(scan1, scan2);
		expect(result.valid).toBe(true);
		expect(result.warning).toBeUndefined();
	});

	it("should warn when comparing different URLs", () => {
		const scan1 = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 5,
			moderate: 5,
			minor: 5,
		});

		const scan2 = createMockScan("2", "https://other.com", {
			critical: 3,
			serious: 3,
			moderate: 3,
			minor: 3,
		});

		const result = validateComparison(scan1, scan2);
		expect(result.valid).toBe(true);
		expect(result.warning).toContain("different URLs");
	});

	it("should prevent comparing scan with itself", () => {
		const scan = createMockScan("1", "https://example.com", {
			critical: 5,
			serious: 5,
			moderate: 5,
			minor: 5,
		});

		const result = validateComparison(scan, scan);
		expect(result.valid).toBe(false);
		expect(result.warning).toContain("itself");
	});
});
