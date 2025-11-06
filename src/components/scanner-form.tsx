"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

export interface ScannerFormProps {
  onSubmit: (url: string, mode: "single" | "exploration") => void;
  loading?: boolean;
}

export default function ScannerForm({
  onSubmit,
  loading = false,
}: ScannerFormProps) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"single" | "exploration">("single");
  const [error, setError] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      const isFocusShortcut =
        event.key.toLowerCase() === "k" &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey;

      if (isFocusShortcut) {
        event.preventDefault();
        urlInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    let urlToScan = url.trim();
    if (!urlToScan.startsWith("http://") && !urlToScan.startsWith("https://")) {
      urlToScan = `https://${urlToScan}`;
    }

    try {
      new URL(urlToScan);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    onSubmit(urlToScan, mode);
  };

  return (
    <form
      id="scanner-form"
      onSubmit={handleSubmit}
      aria-labelledby="scanner-form-title"
      aria-describedby="scanner-form-description"
      tabIndex={-1}
      suppressHydrationWarning
      className="relative w-full overflow-hidden rounded-[3rem] border border-white/60 bg-white/25 p-8 sm:p-10 lg:p-12 shadow-[0_24px_65px_-30px_rgba(15,23,42,0.65)] outline-none backdrop-blur-2xl backdrop-saturate-150 transition focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700/60 dark:bg-slate-950/30 dark:shadow-[0_32px_80px_-38px_rgba(15,23,42,0.9)] dark:focus-visible:border-blue-500/70 dark:focus-visible:ring-blue-500/35 dark:focus-visible:ring-offset-slate-900"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),transparent_45%),linear-gradient(160deg,rgba(148,163,184,0.22),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_55%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(30,41,59,0.6),transparent_45%),linear-gradient(160deg,rgba(148,163,184,0.18),transparent_65%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.22),transparent_55%)]"
      />
      <div className="relative grid items-start gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)]">
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 backdrop-blur-sm dark:border-slate-600/70 dark:bg-slate-900/40 dark:text-slate-300">
            Accessibility-first tooling
          </span>
          <div className="space-y-6">
            <h1
              id="scanner-form-title"
              className="text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl"
            >
              Build experiences everyone can use.
            </h1>
            <p
              id="scanner-form-description"
              className="text-lg text-slate-600 dark:text-slate-300"
            >
              Run focused accessibility scans that highlight what matters: clear
              severity, WCAG references, and practical remediation guidance.
              Designed with inclusive typography, generous contrast, and layouts
              that hold up in high-zoom scenarios.
            </p>
            <ul className="space-y-3 text-left text-base text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-1 text-lg">
                  ✅
                </span>
                <span>
                  Structured reports grouped by impact so triage stays
                  approachable for every teammate.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-1 text-lg">
                  🧭
                </span>
                <span>
                  WCAG success criteria and remediation steps surface beside
                  every finding—no guessing, no extra tabs.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-1 text-lg">
                  🎯
                </span>
                <span>
                  Works great with reduced-motion, high-contrast modes, and
                  keyboard-only navigation.
                </span>
              </li>
            </ul>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No account, no tracking—just actionable insights.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/55 p-6 shadow-[0_18px_45px_-25px_rgba(15,23,42,0.4)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/60 dark:shadow-[0_22px_55px_-28px_rgba(15,23,42,0.75)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="url"
                  className="block text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200"
                >
                  Website URL
                </label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  We'll normalize the address and send a single secure request.
                </p>
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  ref={urlInputRef}
                  className="w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] transition focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-200/70 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-white dark:focus:ring-blue-500/30"
                  disabled={loading}
                  aria-describedby="url-hint"
                  aria-invalid={error ? "true" : "false"}
                />
                <span
                  id="url-hint"
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  Include the protocol if possible. We support HTTPS and HTTP
                  targets.
                </span>
              </div>
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  Scan depth
                </legend>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose a quick pass or a guided crawl of key user journeys.
                </p>
                <div className="space-y-3">
                  <label className="group flex items-start gap-3 rounded-2xl border border-white/60 bg-white/55 px-4 py-4 text-left text-slate-700 shadow-[0_10px_25px_-18px_rgba(15,23,42,0.25)] transition duration-200 focus-within:border-blue-500 focus-within:bg-white/80 focus-within:shadow-[0_18px_35px_-20px_rgba(37,99,235,0.35)] focus-within:ring-4 focus-within:ring-blue-200/70 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-200 dark:focus-within:border-blue-400/80 dark:focus-within:bg-slate-900/70 dark:focus-within:ring-blue-500/30 dark:focus-within:ring-offset-slate-900">
                    <input
                      type="radio"
                      name="mode"
                      value="single"
                      checked={mode === "single"}
                      onChange={(e) => setMode(e.target.value as "single")}
                      disabled={loading}
                      className="peer mt-1 h-5 w-5 border-slate-400 text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-500 dark:bg-slate-900 dark:text-blue-400 dark:focus-visible:ring-blue-400/80 dark:focus-visible:ring-offset-slate-900"
                      aria-describedby="single-mode-copy"
                    />
                    <span>
                      <span className="text-base font-semibold text-slate-900 dark:text-white">
                        Single page review
                      </span>
                      <p
                        id="single-mode-copy"
                        className="mt-1 text-sm text-slate-600 dark:text-slate-300"
                      >
                        Perfect for landing pages or quick checks—one URL, full
                        audit.
                      </p>
                    </span>
                  </label>
                  <label className="group flex items-start gap-3 rounded-2xl border border-white/60 bg-white/55 px-4 py-4 text-left text-slate-700 shadow-[0_10px_25px_-18px_rgba(15,23,42,0.25)] transition duration-200 focus-within:border-blue-500 focus-within:bg-white/80 focus-within:shadow-[0_18px_35px_-20px_rgba(37,99,235,0.35)] focus-within:ring-4 focus-within:ring-blue-200/70 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-slate-700/60 dark:bg-slate-900/50 dark:text-slate-200 dark:focus-within:border-blue-400/80 dark:focus-within:bg-slate-900/70 dark:focus-within:ring-blue-500/30 dark:focus-within:ring-offset-slate-900">
                    <input
                      type="radio"
                      name="mode"
                      value="exploration"
                      checked={mode === "exploration"}
                      onChange={(e) => setMode(e.target.value as "exploration")}
                      disabled={loading}
                      className="peer mt-1 h-5 w-5 border-slate-400 text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-500 dark:bg-slate-900 dark:text-blue-400 dark:focus-visible:ring-blue-400/80 dark:focus-visible:ring-offset-slate-900"
                      aria-describedby="exploration-mode-copy"
                    />
                    <span>
                      <span className="text-base font-semibold text-slate-900 dark:text-white">
                        Multi-page exploration
                      </span>
                      <p
                        id="exploration-mode-copy"
                        className="mt-1 text-sm text-slate-600 dark:text-slate-300"
                      >
                        We&apos;ll follow primary routes (forms, signup,
                        checkout) for a richer snapshot—up to five key pages.
                      </p>
                    </span>
                  </label>
                </div>
              </fieldset>
              {error && (
                <div
                  className="rounded-2xl border border-red-300 bg-red-50/90 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-700 dark:bg-red-900/40 dark:text-red-100"
                  role="alert"
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-blue-700 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:shadow-blue-900/30"
              >
                {loading ? (
                  <span
                    className="flex items-center justify-center"
                    aria-live="polite"
                  >
                    <svg
                      className="mr-3 h-5 w-5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <title>Scanning</title>
                      <circle
                        className="opacity-30"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-80"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Running scan…
                  </span>
                ) : (
                  <>
                    Start scan
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scans run server-side and results never leave this session.
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
