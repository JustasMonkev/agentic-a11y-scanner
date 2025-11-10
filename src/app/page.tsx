"use client";

import { useState } from "react";
import ResultsDisplay from "@/components/results-display";
import ScanProgress from "@/components/scan-progress";
import ScannerForm from "@/components/scanner-form";
import { HistorySidebar } from "@/components/history-sidebar";
import { ComparisonModal } from "@/components/comparison-modal";
import type { ScanResponse } from "@/lib/types";
import type { ScanRecord } from "@/lib/history-types";
import { ScanHistoryManager } from "@/lib/scan-history-manager";

type PageState = "form" | "progress" | "results";

export default function Home() {
  const [pageState, setPageState] = useState<PageState>("form");
  const [results, setResults] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    currentPage: undefined,
    pagesScanned: 0,
    totalPages: undefined,
  });

  // History and comparison state
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [lastScannedUrl, setLastScannedUrl] = useState<string>("");
  const [lastScanMode, setLastScanMode] = useState<"single" | "exploration">(
    "single",
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [comparisonScans, setComparisonScans] = useState<{
    baseline: ScanRecord | null;
    current: ScanRecord | null;
  }>({ baseline: null, current: null });
  const [notification, setNotification] = useState<{
    message: string;
    type: "warning" | "error" | "info";
  } | null>(null);

  const handleScan = async (url: string, mode: "single" | "exploration") => {
    setPageState("progress");
    setError(null);
    setLastScannedUrl(url);
    setLastScanMode(mode);
    setProgress({
      currentPage: undefined,
      pagesScanned: 0,
      totalPages: undefined,
    });

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, mode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scan website");
      }

      const data: ScanResponse = await response.json();

      if (data.status === "success") {
        setResults(data.data);
        setPageState("results");

        // Save scan to history automatically
        const saveResult = ScanHistoryManager.add(
          url,
          mode,
          data.data,
          undefined, // no label by default
          data.metadata?.discoveredUrls,
        );

        if (saveResult.success && saveResult.data) {
          setCurrentScanId(saveResult.data.id);

          // Show warning to user if storage is near capacity
          if (saveResult.warning) {
            console.warn("Scan saved with warning:", saveResult.warning);
            setNotification({
              message: saveResult.warning,
              type: "warning",
            });
            // Auto-dismiss after 5 seconds
            setTimeout(() => setNotification(null), 5000);
          }
        } else {
          // Show error to user if save failed
          console.error("Failed to save scan to history:", saveResult.error);
          setNotification({
            message: `Scan completed but could not be saved to history: ${saveResult.error || "Unknown error"}. Your results are still displayed below.`,
            type: "error",
          });
          // Auto-dismiss after 7 seconds for errors
          setTimeout(() => setNotification(null), 7000);
        }

        return;
      }

      setPageState("form");
      setError(data.error!);
    } catch (err) {
      setPageState("form");
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    }
  };

  const handleNewScan = () => {
    setPageState("form");
    setResults(null);
    setError(null);
    setCurrentScanId(null);
    setProgress({
      currentPage: undefined,
      pagesScanned: 0,
      totalPages: undefined,
    });
  };

  const handleViewScan = (scan: ScanRecord) => {
    setResults(scan.report);
    setCurrentScanId(scan.id);
    setPageState("results");
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const handleCompareScan = (scan: ScanRecord) => {
    // If we already have a baseline, set this as current
    if (comparisonScans.baseline) {
      setComparisonScans({
        baseline: comparisonScans.baseline,
        current: scan,
      });
    } else {
      // If no baseline, set this as baseline and find most recent different scan
      const allScansResult = ScanHistoryManager.getAll();
      if (allScansResult.success && allScansResult.data) {
        const otherScans = allScansResult.data.filter((s) => s.id !== scan.id);
        if (otherScans.length > 0) {
          setComparisonScans({
            baseline: scan,
            current: otherScans[0],
          });
        } else {
          setNotification({
            message: "No other scans available for comparison. Please run at least two scans to enable comparison.",
            type: "info",
          });
          setTimeout(() => setNotification(null), 5000);
        }
      }
    }
  };

  const handleCloseComparison = () => {
    setComparisonScans({ baseline: null, current: null });
  };

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <main className="flex-1 bg-gradient-to-b from-slate-100 via-white to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-black py-16">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <a className="sr-only focus:not-sr-only focus:absolute focus:top-6 focus:left-6 focus:z-50 rounded-md bg-blue-700 px-4 py-2 font-semibold text-white shadow-lg transition">
            Skip to scan form
          </a>

          {/* Error Message */}
          {error && (
            <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg">
              <p className="text-red-800 dark:text-red-200 font-medium mb-2">
                Error
              </p>
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Notification Toast */}
          {notification && (
            <div
              className={`max-w-2xl mx-auto mb-6 p-4 rounded-lg border animate-fade-in ${
                notification.type === "warning"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900"
                  : notification.type === "error"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <p
                  className={`text-sm flex-1 ${
                    notification.type === "warning"
                      ? "text-yellow-800 dark:text-yellow-200"
                      : notification.type === "error"
                        ? "text-red-800 dark:text-red-200"
                        : "text-blue-800 dark:text-blue-200"
                  }`}
                >
                  {notification.message}
                </p>
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className={`text-sm font-medium hover:underline ${
                    notification.type === "warning"
                      ? "text-yellow-700 dark:text-yellow-300"
                      : notification.type === "error"
                        ? "text-red-700 dark:text-red-300"
                        : "text-blue-700 dark:text-blue-300"
                  }`}
                  aria-label="Dismiss notification"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          {pageState === "form" && (
            <section id="scanner" className="scroll-mt-24">
              <ScannerForm onSubmit={handleScan} />
            </section>
          )}

          {pageState === "progress" && (
            <div className="max-w-2xl mx-auto">
              <ScanProgress {...progress} status="scanning" />
            </div>
          )}

          {pageState === "results" && results && (
            <ResultsDisplay results={results} onNewScan={handleNewScan} />
          )}
        </div>
      </main>

      {/* History Sidebar */}
      <HistorySidebar
        onViewScan={handleViewScan}
        onCompareScan={handleCompareScan}
        selectedScanId={currentScanId ?? undefined}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isScanning={pageState === "progress"}
      />

      {/* Comparison Modal */}
      {comparisonScans.baseline && comparisonScans.current && (
        <ComparisonModal
          baseline={comparisonScans.baseline}
          current={comparisonScans.current}
          isOpen={true}
          onClose={handleCloseComparison}
        />
      )}
    </div>
  );
}
