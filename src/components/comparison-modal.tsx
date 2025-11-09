"use client";

import { useEffect, useMemo } from "react";
import type { ScanComparison, ScanRecord } from "@/lib/history-types";
import {
	compareScanRecords,
	formatPercentageChange,
	getComparisonSummary,
	getTrendIndicator,
	validateComparison,
} from "@/lib/comparison-engine";
import { formatFullDate, truncateUrl } from "@/lib/history-utils";

interface ComparisonModalProps {
	baseline: ScanRecord;
	current: ScanRecord;
	isOpen: boolean;
	onClose: () => void;
}

export function ComparisonModal({
	baseline,
	current,
	isOpen,
	onClose,
}: ComparisonModalProps) {
	const comparison = useMemo(
		() => compareScanRecords(baseline, current),
		[baseline, current],
	);

	const validation = useMemo(
		() => validateComparison(baseline, current),
		[baseline, current],
	);

	// Close on Escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const { overall, bySeverity } = comparison;
	const summary = getComparisonSummary(comparison);
	const trend = getTrendIndicator(overall.percentageChange);
	const isImprovement = overall.currentTotal < overall.baselineTotal;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-start justify-between">
					<div className="flex-1">
						<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
							Scan Comparison
						</h2>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
							{summary}
						</p>
						{validation.warning && (
							<p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
								⚠️ {validation.warning}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
						aria-label="Close comparison"
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6">
					{/* Scan Metadata */}
					<div className="grid md:grid-cols-2 gap-4">
						{/* Baseline */}
						<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
								Baseline Scan
							</h3>
							<p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
								{formatFullDate(baseline.timestamp)}
							</p>
							<p
								className="text-sm text-gray-900 dark:text-gray-100 truncate"
								title={baseline.url}
							>
								{truncateUrl(baseline.url, 50)}
							</p>
						</div>

						{/* Current */}
						<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
								Current Scan
							</h3>
							<p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
								{formatFullDate(current.timestamp)}
							</p>
							<p
								className="text-sm text-gray-900 dark:text-gray-100 truncate"
								title={current.url}
							>
								{truncateUrl(current.url, 50)}
							</p>
						</div>
					</div>

					{/* Hero Metrics */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						{/* Total Violations */}
						<div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
							<p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
								Total Violations
							</p>
							<p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
								{overall.currentTotal}
							</p>
							<p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
								was {overall.baselineTotal}
							</p>
						</div>

						{/* Fixed */}
						<div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
							<p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
								Fixed
							</p>
							<p className="text-2xl font-bold text-green-900 dark:text-green-100">
								{overall.fixed}
							</p>
							<p className="text-xs text-green-600 dark:text-green-400 mt-1">
								violations resolved
							</p>
						</div>

						{/* New */}
						<div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg">
							<p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
								New
							</p>
							<p className="text-2xl font-bold text-red-900 dark:text-red-100">
								{overall.new}
							</p>
							<p className="text-xs text-red-600 dark:text-red-400 mt-1">
								new violations
							</p>
						</div>

						{/* Percentage Change */}
						<div
							className={`p-4 rounded-lg bg-gradient-to-br ${
								isImprovement
									? "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
									: "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900"
							}`}
						>
							<p
								className={`text-xs font-medium mb-1 ${
									isImprovement
										? "text-green-700 dark:text-green-300"
										: "text-red-700 dark:text-red-300"
								}`}
							>
								Change
							</p>
							<p
								className={`text-2xl font-bold ${
									isImprovement
										? "text-green-900 dark:text-green-100"
										: "text-red-900 dark:text-red-100"
								}`}
							>
								{trend} {Math.abs(overall.percentageChange).toFixed(1)}%
							</p>
							<p
								className={`text-xs mt-1 ${
									isImprovement
										? "text-green-600 dark:text-green-400"
										: "text-red-600 dark:text-red-400"
								}`}
							>
								{formatPercentageChange(overall.percentageChange)}
							</p>
						</div>
					</div>

					{/* Severity Breakdown */}
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
							Breakdown by Severity
						</h3>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-gray-200 dark:border-gray-700">
										<th className="text-left py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">
											Severity
										</th>
										<th className="text-center py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">
											Baseline
										</th>
										<th className="text-center py-2 px-4 font-semibold text-gray-700 dark:text-gray-300">
											Current
										</th>
										<th className="text-center py-2 px-4 font-semibold text-green-700 dark:text-green-300">
											Fixed
										</th>
										<th className="text-center py-2 px-4 font-semibold text-red-700 dark:text-red-300">
											New
										</th>
									</tr>
								</thead>
								<tbody>
									{(
										["critical", "serious", "moderate", "minor"] as const
									).map((severity) => {
										const data = bySeverity[severity];
										const icons = {
											critical: "🔴",
											serious: "🟠",
											moderate: "🟡",
											minor: "🔵",
										};

										return (
											<tr
												key={severity}
												className="border-b border-gray-100 dark:border-gray-800"
											>
												<td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
													{icons[severity]}{" "}
													{severity.charAt(0).toUpperCase() + severity.slice(1)}
												</td>
												<td className="text-center py-3 px-4 text-gray-700 dark:text-gray-300">
													{data.baselineCount}
												</td>
												<td className="text-center py-3 px-4 text-gray-900 dark:text-gray-100 font-semibold">
													{data.currentCount}
												</td>
												<td className="text-center py-3 px-4 text-green-700 dark:text-green-300 font-semibold">
													{data.fixed > 0 ? `↓ ${data.fixed}` : "—"}
												</td>
												<td className="text-center py-3 px-4 text-red-700 dark:text-red-300 font-semibold">
													{data.new > 0 ? `↑ ${data.new}` : "—"}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>

					{/* Close Button */}
					<div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
						<button
							type="button"
							onClick={onClose}
							className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
