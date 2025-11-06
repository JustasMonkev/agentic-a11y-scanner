"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface ResultsDisplayProps {
  results: string;
  onNewScan?: () => void;
}

export default function ResultsDisplay({
  results,
  onNewScan,
}: ResultsDisplayProps) {
  return (
    <section className="relative mx-auto w-full max-w-5xl rounded-3xl border border-slate-200/80 bg-white/95 p-10 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/50">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200/80 pb-8 dark:border-slate-800/80">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900 dark:bg-blue-900/40 dark:text-blue-100">
            Accessibility report
          </span>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Scan results
          </h1>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <button
            type="button"
            onClick={onNewScan}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-blue-500 hover:text-blue-700 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-400 dark:hover:text-blue-200"
          >
            Start another scan
          </button>
        </div>
      </div>
      <div
        className="mt-8 prose prose-slate dark:prose-invert max-w-none
        prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white
        prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
        prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2 dark:prose-h2:border-slate-700
        prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2
        prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed
        prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold
        prose-code:text-slate-900 dark:prose-code:text-slate-100 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
        prose-pre:bg-slate-950 dark:prose-pre:bg-black prose-pre:text-slate-100 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-800
        prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4
        prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4
        prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:my-1
        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400
        prose-table:border-collapse prose-table:w-full
        prose-th:border prose-th:border-slate-300 dark:prose-th:border-slate-700 prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:p-2 prose-th:text-left prose-th:font-semibold
        prose-td:border prose-td:border-slate-300 dark:prose-td:border-slate-700 prose-td:p-2
        prose-hr:border-slate-200 dark:prose-hr:border-slate-800 prose-hr:my-8
        "
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{results}</ReactMarkdown>
      </div>
    </section>
  );
}
