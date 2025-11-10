"use client";

import type { ScanRecord } from "@/lib/history-types";
import { formatRelativeTime, truncateUrl } from "@/lib/history-utils";

interface HistoryCardProps {
  scan: ScanRecord;
  onView: (scan: ScanRecord) => void;
  onCompare: (scan: ScanRecord) => void;
  onDelete: (scanId: string) => void;
  isSelected?: boolean;
  isScanning?: boolean;
}

export function HistoryCard({
  scan,
  onView,
  onCompare,
  onDelete,
  isSelected = false,
  isScanning = false,
}: HistoryCardProps) {
  const { url, timestamp, metadata, mode, label } = scan;

  return (
    <div
      tabIndex={isScanning ? -1 : 1}
      onClick={() => !isScanning && onView(scan)}
      className={`
        group relative rounded-lg border p-4 transition-all
        ${!isScanning && "hover:border-blue-500 hover:shadow-md"}
        ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-200 dark:border-gray-700"}
        ${isScanning && "opacity-50 cursor-not-allowed"}
      `}
      style={{
        cursor: isScanning ? "not-allowed" : "pointer",
      }}
      onKeyDown={(e) => {
        if (!isScanning && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onView(scan);
        }
      }}
    >
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
              title={url}
            >
              {truncateUrl(url, 40)}
            </h3>
            {label && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {label}
              </p>
            )}
          </div>
          <span
            className={`
            inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
            ${mode === "exploration" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"}
          `}
          >
            {mode === "exploration" ? "Multi-page" : "Single"}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatRelativeTime(timestamp)}
        </p>
      </div>

      {/* Violation Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        {metadata.violationsBySeverity.critical > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            🔴 {metadata.violationsBySeverity.critical}
          </span>
        )}
        {metadata.violationsBySeverity.serious > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            🟠 {metadata.violationsBySeverity.serious}
          </span>
        )}
        {metadata.violationsBySeverity.moderate > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            🟡 {metadata.violationsBySeverity.moderate}
          </span>
        )}
        {metadata.violationsBySeverity.minor > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            🔵 {metadata.violationsBySeverity.minor}
          </span>
        )}
        {metadata.totalViolations === 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✓ No issues
          </span>
        )}
      </div>

      {/* Metadata Footer */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span>Total: {metadata.totalViolations}</span>
        {metadata.pageCount > 1 && <span>{metadata.pageCount} pages</span>}
        {metadata.wcagLevel && <span>WCAG {metadata.wcagLevel}</span>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCompare(scan);
          }}
          disabled={isScanning}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Compare
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(scan.id);
          }}
          disabled={isScanning}
          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900 transition-colors"
          aria-label="Delete scan"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
