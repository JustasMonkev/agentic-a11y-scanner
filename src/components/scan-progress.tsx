"use client";

interface ScanProgressProps {
  currentPage?: string;
  pagesScanned: number;
  totalPages?: number;
  status: "scanning" | "processing" | "complete";
}

export default function ScanProgress({
  currentPage,
  pagesScanned,
  totalPages,
  status,
}: ScanProgressProps) {
  const percentage = totalPages ? (pagesScanned / totalPages) * 100 : 0;

  return (
    <section className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {status === "complete" ? "Scan complete" : "Scanning in progress"}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {status === "processing"
              ? "Organizing results and scoring accessibility health."
              : status === "complete"
                ? "We captured the findings—scroll for detailed guidance."
                : "Reviewing key user flows to surface high-impact fixes."}
          </p>
        </div>
        {status !== "complete" && (
          <div className="flex items-center gap-3 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-2 text-sm font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-100">
            <span
              aria-hidden="true"
              className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-r-transparent"
            />
            <span>
              {status === "processing"
                ? "Crunching results"
                : "Analyzing pages"}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Progress
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            {pagesScanned}
            {totalPages ? ` / ${totalPages}` : ""} pages
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative h-4 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-500 ease-out dark:from-blue-500 dark:to-blue-400"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Current Page Info */}
      {currentPage && status !== "complete" && (
        <div className="mt-6 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-5 text-sm text-blue-900 shadow-sm dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-100">
          <p className="font-semibold">Currently scanning</p>
          <p className="mt-2 break-all font-mono text-xs tracking-tight text-blue-800 dark:text-blue-200">
            {currentPage}
          </p>
        </div>
      )}

      {/* Status Messages */}
      {status === "processing" && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900 shadow-sm dark:border-amber-900/70 dark:bg-amber-900/30 dark:text-amber-200">
          Organizing results and calculating severity scores…
        </div>
      )}

      {status === "complete" && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-900 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200">
          Scan completed successfully. Your accessibility report is ready below.
        </div>
      )}
    </section>
  );
}
