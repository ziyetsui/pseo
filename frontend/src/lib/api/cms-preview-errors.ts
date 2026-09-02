export type CmsPreviewErrorCode =
  | "invalid-config"
  | "unauthorized"
  | "timeout"
  | "unavailable"
  | "invalid-response";

export class CmsPreviewClientError extends Error {
  readonly code: CmsPreviewErrorCode;
  readonly status: number | null;

  constructor(code: CmsPreviewErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "CmsPreviewClientError";
    this.code = code;
    this.status = status;
  }
}
