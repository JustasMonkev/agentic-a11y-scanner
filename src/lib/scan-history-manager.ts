/**
 * ScanHistoryManager - Manages scan history in localStorage
 * Handles CRUD operations, quota management, and LRU eviction
 */

import type {
  HistoryFilter,
  ScanHistory,
  ScanRecord,
  StorageQuota,
  StorageResult,
} from "./history-types";
import {
  estimateObjectSize,
  generateScanId,
  parseReportMetadata,
  sanitizeLabel,
} from "./history-utils";

/** localStorage key for scan history */
const STORAGE_KEY = "accessibility_scan_history";

/** Current schema version */
const SCHEMA_VERSION = 1;

/** Maximum number of scans to keep (LRU eviction) */
const MAX_SCANS = 50;

/** localStorage size limit (conservative estimate: 5MB) */
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

/** Warning threshold (80% of limit) */
const WARNING_THRESHOLD = STORAGE_LIMIT_BYTES * 0.8;

/** Auto-prune threshold (95% of limit) */
const PRUNE_THRESHOLD = STORAGE_LIMIT_BYTES * 0.95;

/**
 * ScanHistoryManager class for managing scan history
 */
export class ScanHistoryManager {
  /**
   * Checks if localStorage is available and functional
   */
  private static isStorageAvailable(): boolean {
    try {
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the current storage quota information
   */
  static getQuota(): StorageQuota {
    try {
      const history = this.loadHistory();
      const used = estimateObjectSize(history);
      const percentageUsed = (used / STORAGE_LIMIT_BYTES) * 100;

      return {
        used,
        limit: STORAGE_LIMIT_BYTES,
        percentageUsed: Math.min(percentageUsed, 100),
        scanCount: history.scans.length,
      };
    } catch {
      return {
        used: 0,
        limit: STORAGE_LIMIT_BYTES,
        percentageUsed: 0,
        scanCount: 0,
      };
    }
  }

  /**
   * Loads scan history from localStorage
   */
  private static loadHistory(): ScanHistory {
    if (!this.isStorageAvailable()) {
      console.warn("[ScanHistory] localStorage not available");
      return this.createEmptyHistory();
    }

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return this.createEmptyHistory();
      }

      const parsed = JSON.parse(data) as ScanHistory;

      // Validate structure
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed.scans)
      ) {
        console.error("[ScanHistory] Invalid data structure, resetting");
        return this.createEmptyHistory();
      }

      // Handle schema migrations
      if (parsed.version !== SCHEMA_VERSION) {
        return this.migrateSchema(parsed);
      }

      return parsed;
    } catch (error) {
      console.error("[ScanHistory] Failed to load history:", error);
      return this.createEmptyHistory();
    }
  }

  /**
   * Saves scan history to localStorage
   */
  private static saveHistory(history: ScanHistory): StorageResult<void> {
    if (!this.isStorageAvailable()) {
      return {
        success: false,
        error: "localStorage is not available (private browsing mode?)",
      };
    }

    try {
      const serialized = JSON.stringify(history);
      const size = serialized.length * 2; // Approximate bytes

      // Check quota
      if (size > STORAGE_LIMIT_BYTES) {
        // Try to prune old scans
        const pruned = this.pruneOldScans(history);
        const prunedSize = estimateObjectSize(pruned);

        if (prunedSize > STORAGE_LIMIT_BYTES) {
          return {
            success: false,
            error: "Storage quota exceeded even after pruning",
          };
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
        return {
          success: true,
          warning: "Storage was near capacity. Oldest scans were removed.",
        };
      }

      localStorage.setItem(STORAGE_KEY, serialized);

      // Check if approaching quota
      if (size > WARNING_THRESHOLD) {
        return {
          success: true,
          warning: `Storage is at ${Math.round((size / STORAGE_LIMIT_BYTES) * 100)}% capacity`,
        };
      }

      return { success: true };
    } catch (error) {
      // Handle QuotaExceededError
      if (
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" ||
          error.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ) {
        // Try aggressive pruning
        try {
          const pruned = this.pruneOldScans(history, 0.5); // Remove 50% of scans
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
          return {
            success: true,
            warning: "Storage quota exceeded. Removed 50% of oldest scans.",
          };
        } catch {
          return {
            success: false,
            error: "Storage quota exceeded and unable to free space",
          };
        }
      }

      console.error("[ScanHistory] Failed to save history:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Creates an empty history object
   */
  private static createEmptyHistory(): ScanHistory {
    return {
      version: SCHEMA_VERSION,
      scans: [],
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * Migrates old schema to current version
   */
  private static migrateSchema(oldHistory: ScanHistory): ScanHistory {
    // Future: Implement migration logic when schema changes
    console.warn(
      `[ScanHistory] Migrating from version ${oldHistory.version} to ${SCHEMA_VERSION}`,
    );

    // For now, just update version
    return {
      ...oldHistory,
      version: SCHEMA_VERSION,
    };
  }

  /**
   * Prunes old scans using LRU strategy
   */
  private static pruneOldScans(
    history: ScanHistory,
    keepRatio = 0.5,
  ): ScanHistory {
    const keepCount = Math.floor(history.scans.length * keepRatio);
    const prunedScans = history.scans
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, keepCount);

    console.warn(
      `[ScanHistory] Pruned ${history.scans.length - prunedScans.length} old scans`,
    );

    return {
      ...history,
      scans: prunedScans,
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * Retrieves all scan records
   */
  static getAll(): StorageResult<ScanRecord[]> {
    try {
      const history = this.loadHistory();
      return {
        success: true,
        data: history.scans,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Retrieves a scan by ID
   */
  static getById(id: string): StorageResult<ScanRecord> {
    try {
      const history = this.loadHistory();
      const scan = history.scans.find((s) => s.id === id);

      if (!scan) {
        return {
          success: false,
          error: `Scan with ID ${id} not found`,
        };
      }

      return {
        success: true,
        data: scan,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Retrieves scans by URL (exact or partial match)
   */
  static getByUrl(
    url: string,
    exactMatch = false,
  ): StorageResult<ScanRecord[]> {
    try {
      const history = this.loadHistory();
      const scans = exactMatch
        ? history.scans.filter((s) => s.url === url)
        : history.scans.filter((s) =>
            s.url.toLowerCase().includes(url.toLowerCase()),
          );

      return {
        success: true,
        data: scans,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Filters scans based on criteria
   */
  static filter(criteria: HistoryFilter): StorageResult<ScanRecord[]> {
    try {
      const history = this.loadHistory();
      let filtered = history.scans;

      if (criteria.url) {
        filtered = filtered.filter((s) =>
          s.url.toLowerCase().includes(criteria.url!.toLowerCase()),
        );
      }

      if (criteria.mode) {
        filtered = filtered.filter((s) => s.mode === criteria.mode);
      }

      if (criteria.dateFrom) {
        filtered = filtered.filter(
          (s) => new Date(s.timestamp) >= new Date(criteria.dateFrom!),
        );
      }

      if (criteria.dateTo) {
        filtered = filtered.filter(
          (s) => new Date(s.timestamp) <= new Date(criteria.dateTo!),
        );
      }

      if (criteria.minViolations !== undefined) {
        filtered = filtered.filter(
          (s) => s.metadata.totalViolations >= criteria.minViolations!,
        );
      }

      if (criteria.maxViolations !== undefined) {
        filtered = filtered.filter(
          (s) => s.metadata.totalViolations <= criteria.maxViolations!,
        );
      }

      return {
        success: true,
        data: filtered,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Adds a new scan to history
   */
  static add(
    url: string,
    mode: "single" | "exploration",
    report: string,
    label?: string,
    discoveredUrls?: string[],
  ): StorageResult<ScanRecord> {
    try {
      const history = this.loadHistory();

      // Generate new scan record
      const scan: ScanRecord = {
        id: generateScanId(),
        url,
        mode,
        timestamp: new Date().toISOString(),
        report,
        metadata: parseReportMetadata(report, mode),
        label,
        discoveredUrls,
      };

      // Add to beginning (most recent first)
      history.scans.unshift(scan);

      // Enforce max scans limit
      if (history.scans.length > MAX_SCANS) {
        history.scans = history.scans.slice(0, MAX_SCANS);
      }

      history.lastModified = new Date().toISOString();

      // Save and check result
      const saveResult = this.saveHistory(history);
      if (!saveResult.success) {
        return saveResult as StorageResult<ScanRecord>;
      }

      return {
        success: true,
        data: scan,
        warning: saveResult.warning,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Deletes a scan by ID
   */
  static delete(id: string): StorageResult<void> {
    try {
      const history = this.loadHistory();
      const index = history.scans.findIndex((s) => s.id === id);

      if (index === -1) {
        return {
          success: false,
          error: `Scan with ID ${id} not found`,
        };
      }

      history.scans.splice(index, 1);
      history.lastModified = new Date().toISOString();

      return this.saveHistory(history);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clears all scan history
   */
  static clear(): StorageResult<void> {
    try {
      const emptyHistory = this.createEmptyHistory();
      return this.saveHistory(emptyHistory);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Updates a scan's label
   */
  static updateLabel(id: string, label: string): StorageResult<ScanRecord> {
    try {
      const history = this.loadHistory();
      const scan = history.scans.find((s) => s.id === id);

      if (!scan) {
        return {
          success: false,
          error: `Scan with ID ${id} not found`,
        };
      }

      // Sanitize and set label (trim and limit length)
      scan.label = label ? sanitizeLabel(label) : undefined;
      history.lastModified = new Date().toISOString();

      const saveResult = this.saveHistory(history);
      if (!saveResult.success) {
        return saveResult as StorageResult<ScanRecord>;
      }

      return {
        success: true,
        data: scan,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Exports history as JSON
   */
  static exportAsJson(): StorageResult<string> {
    try {
      const history = this.loadHistory();
      const json = JSON.stringify(history, null, 2);
      return {
        success: true,
        data: json,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Imports history from JSON
   */
  static importFromJson(json: string): StorageResult<void> {
    try {
      const imported = JSON.parse(json) as ScanHistory;

      // Validate structure
      if (
        !imported ||
        typeof imported !== "object" ||
        !Array.isArray(imported.scans)
      ) {
        return {
          success: false,
          error: "Invalid import data structure",
        };
      }

      // Migrate if needed
      const migrated =
        imported.version === SCHEMA_VERSION
          ? imported
          : this.migrateSchema(imported);

      return this.saveHistory(migrated);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Invalid JSON",
      };
    }
  }
}
