"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScanRecord } from "@/lib/history-types";
import { ScanHistoryManager } from "@/lib/scan-history-manager";
import { HistoryCard } from "./history-card";

interface HistorySidebarProps {
  onViewScan: (scan: ScanRecord) => void;
  onCompareScan: (scan: ScanRecord) => void;
  selectedScanId?: string;
  isOpen: boolean;
  onToggle: () => void;
  isScanning?: boolean;
}

export function HistorySidebar({
  onViewScan,
  onCompareScan,
  selectedScanId,
  isOpen,
  onToggle,
  isScanning = false,
}: HistorySidebarProps) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [filterUrl, setFilterUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // Load scans from localStorage
  const loadScans = useCallback(() => {
    setLoading(true);
    const result = ScanHistoryManager.getAll();
    if (result.success && result.data) {
      setScans(result.data);
    } else {
      console.error("Failed to load scans:", result.error);
      setScans([]);
    }

    // Check storage quota
    const quota = ScanHistoryManager.getQuota();
    if (quota.percentageUsed > 80) {
      setStorageWarning(
        `Storage is ${Math.round(quota.percentageUsed)}% full (${quota.scanCount} scans)`,
      );
    } else {
      setStorageWarning(null);
    }

    setLoading(false);
  }, []);

  // Load on mount, when sidebar opens, or when a new scan is added
  useEffect(() => {
    loadScans();
  }, [isOpen, selectedScanId, loadScans]);

  // Filter scans by URL
  const filteredScans = useMemo(() => {
    if (!filterUrl) return scans;
    return scans.filter((scan) =>
      scan.url.toLowerCase().includes(filterUrl.toLowerCase()),
    );
  }, [scans, filterUrl]);

  // Handle delete
  const handleDelete = useCallback((scanId: string) => {
    if (!confirm("Are you sure you want to delete this scan from history?")) {
      return;
    }

    const result = ScanHistoryManager.delete(scanId);
    if (result.success) {
      setScans((prev) => prev.filter((s) => s.id !== scanId));
    } else {
      alert(`Failed to delete scan: ${result.error}`);
    }
  }, []);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    if (
      !confirm(
        "Are you sure you want to delete all scan history? This cannot be undone.",
      )
    ) {
      return;
    }

    const result = ScanHistoryManager.clear();
    if (result.success) {
      setScans([]);
      setStorageWarning(null);
    } else {
      alert(`Failed to clear history: ${result.error}`);
    }
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    const result = ScanHistoryManager.exportAsJson();
    if (!result.success || !result.data) {
      alert(`Failed to export: ${result.error}`);
      return;
    }

    // Download as JSON file
    const blob = new Blob([result.data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scan-history-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        type="button"
        onClick={onToggle}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Toggle history sidebar"
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 right-0 h-screen w-full sm:w-96
          bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700
          overflow-y-auto z-40 transition-transform duration-300
          ${isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Scan History
            </h2>
            <button
              type="button"
              onClick={onToggle}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close sidebar"
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

          {/* Storage Warning */}
          {storageWarning && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                ⚠️ {storageWarning}
              </p>
            </div>
          )}

          {/* Filter Input */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Filter by URL..."
              value={filterUrl}
              onChange={(e) => setFilterUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={handleExport}
              disabled={scans.length === 0 || isScanning}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Export
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={scans.length === 0 || isScanning}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Scan Count */}
          <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {filteredScans.length === 0 && scans.length > 0
              ? "No scans match filter"
              : `${filteredScans.length} ${filteredScans.length === 1 ? "scan" : "scans"}`}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          )}

          {/* Empty State */}
          {!loading && scans.length === 0 && (
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No scan history yet
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                Run your first accessibility scan to get started
              </p>
            </div>
          )}

          {/* Scan List */}
          {!loading && filteredScans.length > 0 && (
            <div className="space-y-3">
              {filteredScans.map((scan) => (
                <HistoryCard
                  key={scan.id}
                  scan={scan}
                  onView={onViewScan}
                  onCompare={onCompareScan}
                  onDelete={handleDelete}
                  isSelected={scan.id === selectedScanId}
                  isScanning={isScanning}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
}
