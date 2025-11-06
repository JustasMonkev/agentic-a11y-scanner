# Multi-Agent Web Scanner Architecture

This document explains the multi-agent web accessibility scanner system, including how agents are invoked, what prompts they use, and how the system orchestrates parallel scanning.

## Overview

The multi-agent system consists of three types of specialized agents that work together to perform comprehensive web accessibility scans:

1. **Discovery Agent** - Analyzes the main page and identifies important URLs to scan
2. **Page Scanner Agents** (up to 4) - Scan individual pages in parallel
3. **Summarizer Agent** - Combines all results into a comprehensive report

## System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Multi-Agent Scan Flow                    │
└─────────────────────────────────────────────────────────────┘

Step 1: Discovery Agent
┌──────────────────────┐
│  Discovery Agent     │
│  - Navigate to URL   │
│  - Get page HTML     │
│  - Identify 3-4 URLs │
└──────────┬───────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│ Discovered URLs:                                 │
│ 1. https://example.com/signup                   │
│ 2. https://example.com/login                    │
│ 3. https://example.com/checkout                 │
│ 4. https://example.com/contact                  │
└────────────────────┬────────────────────────────┘
                     │
Step 2: Parallel Page Scans (up to 4 agents)
                     ▼
   ┌─────────────────┼─────────────────┐
   │                 │                 │
   ▼                 ▼                 ▼
┌──────┐         ┌──────┐         ┌──────┐
│Agent1│         │Agent2│         │Agent3│  ...
│Scan  │         │Scan  │         │Scan  │
│URL 1 │         │URL 2 │         │URL 3 │
└───┬──┘         └───┬──┘         └───┬──┘
    │                │                │
    └────────┬───────┴────────┬───────┘
             │                │
             ▼                ▼
    ┌────────────────────────────┐
    │ Individual Scan Results    │
    │ - Page 1: 15 violations    │
    │ - Page 2: 8 violations     │
    │ - Page 3: 12 violations    │
    └──────────────┬─────────────┘
                   │
Step 3: Summarizer Agent
                   ▼
         ┌──────────────────┐
         │ Summarizer Agent │
         │ - Combine results│
         │ - Identify patterns
         │ - Prioritize issues
         └────────┬─────────┘
                  │
                  ▼
    ┌──────────────────────────┐
    │ Comprehensive Report     │
    │ - Executive Summary      │
    │ - Cross-page Issues      │
    │ - Priority Actions       │
    └──────────────────────────┘
```

## Agent Types and Invocations

### 1. Discovery Agent

**Purpose:** Scans the main page to understand context and identify the most important URLs to scan.

**Agent Creation:**
```typescript
const agent = await createScannerAgent(URL_DISCOVERY_AGENT_PROMPT);
```

**System Prompt:** See `src/lib/agent-prompts.ts` - `URL_DISCOVERY_AGENT_PROMPT`

**Key Responsibilities:**
- Navigate to the main page in headless browser mode
- Handle cookie banners and modals
- Extract page HTML structure
- Identify 3-4 high-priority URLs (signup, login, checkout, forms, etc.)
- Return structured JSON result

**Invocation Example:**
```typescript
const prompt = `Analyze this URL and discover the most important pages to scan: ${mainUrl}

Follow these steps:
1. Navigate to the URL in headless mode
2. Handle any cookie banners or modals
3. Get the page HTML snapshot
4. Identify 3-4 key URLs (prioritize: signup, login, checkout, forms, main features)
5. Close the browser
6. Return the results in the exact JSON format specified in your system prompt

Remember: Return ONLY the JSON object, no additional text or markdown.`;

const result = await agent.invoke({ messages: [new HumanMessage(prompt)] });
```

**Expected Output Format:**
```json
{
  "mainPageUrl": "https://example.com",
  "mainPageHtml": "<html>...</html>",
  "discoveredUrls": [
    {
      "url": "https://example.com/signup",
      "description": "User registration page",
      "priority": "high"
    },
    {
      "url": "https://example.com/checkout",
      "description": "Checkout and payment flow",
      "priority": "high"
    }
  ]
}
```

**Tools Available:**
- `browser_navigate` - Navigate to URLs
- `browser_snapshot` - Get page HTML/DOM
- `browser_click` - Click elements (for cookie banners)
- `browser_wait_for` - Wait for elements
- `browser_close` - Close browser

---

### 2. Page Scanner Agents

**Purpose:** Scan individual pages for accessibility violations in parallel.

**Agent Creation:**
```typescript
const agent = await createScannerAgent(PAGE_SCANNER_AGENT_PROMPT);
```

**System Prompt:** See `src/lib/agent-prompts.ts` - `PAGE_SCANNER_AGENT_PROMPT`

**Key Responsibilities:**
- Navigate to a specific URL
- Handle cookie banners and modals
- Run accessibility scan using `scan_page` tool
- Analyze violations
- Return markdown-formatted report

**Parallel Execution:**
```typescript
// Launch all scanner agents in parallel
const urls = ["url1", "url2", "url3", "url4"];
const scanPromises = urls.map((url, index) => runPageScannerAgent(url, index));
const results = await Promise.all(scanPromises);
```

**Invocation Example:**
```typescript
const prompt = `Scan this URL for accessibility violations: ${url}

Follow these steps:
1. Navigate to the URL in headless mode
2. Handle any cookie banners or modals
3. Wait for the page to fully load
4. Run the scan_page tool
5. Analyze the results
6. Close the browser
7. Return a markdown-formatted accessibility report

Format your response as specified in your system prompt.`;

const result = await agent.invoke({ messages: [new HumanMessage(prompt)] });
```

**Expected Output Format:**
```markdown
# Accessibility Scan: Page Title

**URL:** https://example.com/signup
**Total Violations:** 15

---

## 🔴 Critical Issues
### 1. Missing Form Labels
- **WCAG Criterion:** 1.3.1 Info and Relationships
- **Elements Affected:** `input[type="email"]`, `input[type="password"]`
- **Current State:** Form inputs lack associated labels
- **User Impact:** Screen reader users cannot identify form fields

## 🟠 Serious Issues
### 1. Low Contrast Text
- **WCAG Criterion:** 1.4.3 Contrast (Minimum)
- **Elements Affected:** `.text-gray-500`
- **Current State:** Text has 3.5:1 contrast ratio
- **User Impact:** Low vision users struggle to read text
```

**Tools Available:**
- `browser_navigate` - Navigate to URL
- `browser_snapshot` - Get page HTML
- `browser_click` - Click elements
- `browser_wait_for` - Wait for elements
- `scan_page` - Run accessibility scan
- `browser_close` - Close browser

---

### 3. Summarizer Agent

**Purpose:** Combine all scan results into a comprehensive, prioritized report.

**Agent Creation:**
```typescript
const agent = await createScannerAgent(SUMMARIZER_AGENT_PROMPT);
```

**System Prompt:** See `src/lib/agent-prompts.ts` - `SUMMARIZER_AGENT_PROMPT`

**Key Responsibilities:**
- Analyze all scan results from multiple pages
- Identify patterns and common issues
- Prioritize violations by severity and frequency
- Create unified recommendations
- Generate compliance summary

**Invocation Example:**
```typescript
const scanReports = pageScanResults
  .map((scan, index) => `
## Page ${index + 1}: ${scan.url}
${scan.scanData}
`)
  .join("\n\n---\n\n");

const prompt = `Create a comprehensive accessibility report combining the following scan results:

**Main URL:** ${mainPageUrl}
**Pages Scanned:** ${pageScanResults.length}

**Individual Page Scan Results:**

${scanReports}

Analyze all the above results and create a unified, comprehensive accessibility report following the format specified in your system prompt. Identify patterns, prioritize issues, and provide actionable recommendations.`;

const result = await agent.invoke({ messages: [new HumanMessage(prompt)] });
```

**Expected Output Format:**
```markdown
# Comprehensive Accessibility Scan Report

**Main URL:** https://example.com
**Scan Date:** 2025-11-04
**Pages Analyzed:** 4
**Total Violations Found:** 47

---

## Executive Summary

The site has critical accessibility issues affecting screen reader users and keyboard navigation. Missing form labels on the signup and checkout pages prevent users from completing core workflows. Color contrast issues are present across all pages.

---

## 🔴 Critical Issues (Site-Wide)

### 1. Missing Form Labels
- **WCAG Criterion:** 1.3.1 Info and Relationships
- **Affected Pages:** Signup, Login, Checkout
- **Elements Affected:** All form inputs
- **User Impact:** Screen reader users cannot complete registration or purchase
- **Recommendation:** Add explicit `<label>` elements or `aria-label` attributes to all form inputs

### 2. Keyboard Navigation Broken
- **WCAG Criterion:** 2.1.1 Keyboard
- **Affected Pages:** All pages
- **Elements Affected:** Custom dropdown menus
- **User Impact:** Keyboard-only users cannot access navigation
- **Recommendation:** Implement keyboard event handlers and focus management

---

## Page-Specific Findings

### Signup Page - https://example.com/signup
- 15 violations (8 critical, 5 serious, 2 moderate)
- Primary issues: Missing form labels, no error announcements

### Checkout Page - https://example.com/checkout
- 12 violations (6 critical, 4 serious, 2 moderate)
- Primary issues: Missing payment form labels, poor error handling

---

## Priority Actions

1. **Immediate (Day 1):**
   - Add labels to all form inputs
   - Fix keyboard navigation in main menu

2. **Short Term (Week 1):**
   - Improve color contrast across all text
   - Add ARIA landmarks to pages
   - Implement skip links

3. **Long Term (Month 1):**
   - Add comprehensive error announcements
   - Implement focus management in modals
   - Add screen reader testing to CI/CD

---

## Compliance Summary

- **WCAG 2.1 Level A:** Fail - 15 issues
- **WCAG 2.1 Level AA:** Fail - 32 issues
- **WCAG 2.1 Level AAA:** Fail - 47 issues
```

**Tools Available:**
- None (no browser interaction needed, only analysis)

---

## Implementation Details

### File Structure

```
src/lib/
├── multi-agent-types.ts          # Type definitions
├── agent-prompts.ts               # Agent system prompts
├── multi-agent-orchestrator.ts   # Main orchestration logic
└── __tests__/
    └── multi-agent-orchestrator.test.ts  # Unit tests
```

### Key Functions

#### `runMultiAgentScan(mainUrl: string)`
Main entry point for the multi-agent scan. Orchestrates the entire flow.

**Returns:**
```typescript
MultiAgentScanResult
```

#### `runDiscoveryAgent(mainUrl: string)`
Executes the discovery agent to identify important URLs.

#### `runSummarizerAgent(discoveryResult, pageScanResults)`
Combines all results into a comprehensive report.

### Usage in API

```typescript
// In src/app/api/scan/route.ts
if (mode === "exploration") {
  const result = await runMultiAgentScan(url);

  return NextResponse.json({
    status: "success",
    data: result.finalReport,
    metadata: {
      pagesScanned: result.pageScanResults.length,
      totalViolations: result.totalViolations,
    },
  });
}
```

## Performance Characteristics

### Timing Breakdown

**Optimized scan of 4 pages (with fast summarizer model):**
- **Discovery Agent:** 10-15 seconds (using gpt-5-nano or OPENAI_MODEL)
- **Parallel Page Scans:** 20-30 seconds (4 agents running simultaneously using gpt-5-nano)
- **Summarizer Agent:** 10-15 seconds (using gpt-4o-mini by default) ⚡ **5x faster!**
- **Total:** ~40-60 seconds

**Model Configuration:**
The system uses different models optimized for different tasks:
- **Scanner agents** (Discovery & Page Scanners): Use `OPENAI_MODEL` env var or default `gpt-5-nano-2025-08-07`
  - These agents need browser tool access for navigation and scanning
- **Summarizer agent**: Use `OPENAI_SUMMARIZER_MODEL` env var or default `gpt-4o-mini`
  - This agent only processes text, no browser tools needed
  - Using a faster model here saves 70-80 seconds without quality loss!

**Performance Optimization:**
- Timeouts: 60s for scanners, 90s for summarizer
- Recursion limits: 50 (down from 100)
- Parallel execution: All 4 page scanners run simultaneously

## Testing

Unit tests are provided in `src/lib/__tests__/multi-agent-orchestrator.test.ts`.

Run tests:
```bash
npm test
npm run test:ui      # Interactive UI
npm run test:coverage # With coverage report
```

Test coverage includes:
- Helper function logic (parseDiscoveryResult, extractViolationCount)
- Data structure validation
- Flow logic (URL limiting, violation counting)
- Prompt construction
- Error handling
- Parallel execution simulation

## Future Enhancements

1. **Adaptive URL Selection:** Use ML to predict which pages are most likely to have accessibility issues
2. **Caching:** Cache discovery results for faster subsequent scans
3. **Streaming:** Stream results as each agent completes
4. **Retry Logic:** Implement automatic retry for failed agent invocations
5. **Custom Agent Pool:** Allow users to specify the number of parallel scanner agents

## Troubleshooting

### Common Issues

**Issue:** Discovery agent returns empty URLs
- **Cause:** Page requires JavaScript or has complex navigation
- **Solution:** Increase wait time in discovery agent, or manually specify URLs

**Issue:** Page scanner times out
- **Cause:** Page is slow to load or has blocking resources
- **Solution:** Increase timeout in agent invocation or add custom wait conditions

**Issue:** Summarizer report is not comprehensive
- **Cause:** Individual scan reports lack detail
- **Solution:** Enhance page scanner prompts to extract more information

## References

- LangChain Agent Documentation: https://js.langchain.com/docs/modules/agents/
- MCP Protocol: https://modelcontextprotocol.io/
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
