export interface ScanRequest {
  url: string;
  mode: "single" | "exploration";
}

export interface ScanResponse {
  status: "success" | "error" | "in_progress";
  data: string;
  error?: string;
  metadata?: Record<string, unknown>;
}
