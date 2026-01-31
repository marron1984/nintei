/**
 * 統一エラーコード/メッセージ設計
 */

export type ErrorCode =
  // 認証・認可
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_2FA_REQUIRED'
  | 'AUTH_2FA_INVALID'
  | 'AUTH_PERMISSION_DENIED'
  | 'AUTH_RESOURCE_FORBIDDEN'
  // バリデーション
  | 'VALIDATION_FAILED'
  | 'VALIDATION_REQUIRED_FIELD'
  | 'VALIDATION_INVALID_FORMAT'
  | 'VALIDATION_OUT_OF_RANGE'
  // リソース
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_ALREADY_EXISTS'
  | 'RESOURCE_CONFLICT'
  | 'RESOURCE_LOCKED'
  // ビジネスロジック
  | 'BUSINESS_INVALID_STATE'
  | 'BUSINESS_APPROVAL_REQUIRED'
  | 'BUSINESS_DEADLINE_PASSED'
  | 'BUSINESS_QUOTA_EXCEEDED'
  // システム
  | 'SYSTEM_INTERNAL_ERROR'
  | 'SYSTEM_SERVICE_UNAVAILABLE'
  | 'SYSTEM_DATABASE_ERROR'
  | 'SYSTEM_EXTERNAL_SERVICE_ERROR';

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
  timestamp: Date;
}

export interface ApiErrorResponse {
  success: false;
  error: AppError;
  requestId: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * エラーメッセージマッピング（多言語対応用のキー）
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_INVALID_CREDENTIALS: 'error.auth.invalid_credentials',
  AUTH_TOKEN_EXPIRED: 'error.auth.token_expired',
  AUTH_TOKEN_INVALID: 'error.auth.token_invalid',
  AUTH_2FA_REQUIRED: 'error.auth.2fa_required',
  AUTH_2FA_INVALID: 'error.auth.2fa_invalid',
  AUTH_PERMISSION_DENIED: 'error.auth.permission_denied',
  AUTH_RESOURCE_FORBIDDEN: 'error.auth.resource_forbidden',
  VALIDATION_FAILED: 'error.validation.failed',
  VALIDATION_REQUIRED_FIELD: 'error.validation.required_field',
  VALIDATION_INVALID_FORMAT: 'error.validation.invalid_format',
  VALIDATION_OUT_OF_RANGE: 'error.validation.out_of_range',
  RESOURCE_NOT_FOUND: 'error.resource.not_found',
  RESOURCE_ALREADY_EXISTS: 'error.resource.already_exists',
  RESOURCE_CONFLICT: 'error.resource.conflict',
  RESOURCE_LOCKED: 'error.resource.locked',
  BUSINESS_INVALID_STATE: 'error.business.invalid_state',
  BUSINESS_APPROVAL_REQUIRED: 'error.business.approval_required',
  BUSINESS_DEADLINE_PASSED: 'error.business.deadline_passed',
  BUSINESS_QUOTA_EXCEEDED: 'error.business.quota_exceeded',
  SYSTEM_INTERNAL_ERROR: 'error.system.internal_error',
  SYSTEM_SERVICE_UNAVAILABLE: 'error.system.service_unavailable',
  SYSTEM_DATABASE_ERROR: 'error.system.database_error',
  SYSTEM_EXTERNAL_SERVICE_ERROR: 'error.system.external_service_error',
};

/**
 * エラーコードからHTTPステータスコードへのマッピング
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_TOKEN_EXPIRED: 401,
  AUTH_TOKEN_INVALID: 401,
  AUTH_2FA_REQUIRED: 403,
  AUTH_2FA_INVALID: 403,
  AUTH_PERMISSION_DENIED: 403,
  AUTH_RESOURCE_FORBIDDEN: 403,
  VALIDATION_FAILED: 400,
  VALIDATION_REQUIRED_FIELD: 400,
  VALIDATION_INVALID_FORMAT: 400,
  VALIDATION_OUT_OF_RANGE: 400,
  RESOURCE_NOT_FOUND: 404,
  RESOURCE_ALREADY_EXISTS: 409,
  RESOURCE_CONFLICT: 409,
  RESOURCE_LOCKED: 423,
  BUSINESS_INVALID_STATE: 422,
  BUSINESS_APPROVAL_REQUIRED: 422,
  BUSINESS_DEADLINE_PASSED: 422,
  BUSINESS_QUOTA_EXCEEDED: 429,
  SYSTEM_INTERNAL_ERROR: 500,
  SYSTEM_SERVICE_UNAVAILABLE: 503,
  SYSTEM_DATABASE_ERROR: 500,
  SYSTEM_EXTERNAL_SERVICE_ERROR: 502,
};

/**
 * AppErrorを生成するヘルパー関数
 */
export function createAppError(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>,
  field?: string
): AppError {
  return {
    code,
    message: message ?? ERROR_MESSAGES[code],
    details,
    field,
    timestamp: new Date(),
  };
}

/**
 * カスタムErrorクラス
 */
export class ApplicationError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly field?: string;
  public readonly httpStatus: number;

  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>, field?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'ApplicationError';
    this.code = code;
    this.details = details;
    this.field = field;
    this.httpStatus = ERROR_HTTP_STATUS[code];
  }

  toAppError(): AppError {
    return createAppError(this.code, this.message, this.details, this.field);
  }
}
