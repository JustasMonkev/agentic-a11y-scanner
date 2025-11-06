"use client";

import { useState } from "react";
import ResultsDisplay from "@/components/results-display";
import ScanProgress from "@/components/scan-progress";
import ScannerForm from "@/components/scanner-form";
import type { ScanResponse } from "@/lib/types";

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

  const handleScan = async (url: string, mode: "single" | "exploration") => {
    setPageState("progress");
    setError(null);
    setProgress({
      currentPage: undefined,
      pagesScanned: 0,
      totalPages: undefined,
    });

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
      return;
    }

    setPageState("form");
    setError(data.error!);
  };

  const handleNewScan = () => {
    setPageState("form");
    setResults(null);
    setError(null);
    setProgress({
      currentPage: undefined,
      pagesScanned: 0,
      totalPages: undefined,
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-black py-16">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:top-6 focus:left-6 focus:z-50 rounded-md bg-blue-700 px-4 py-2 font-semibold text-white shadow-lg transition"
        >
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
  );
}
