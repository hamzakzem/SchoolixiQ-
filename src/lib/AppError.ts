export type AppErrorSource =
  | 'auth'
  | 'firebase'
  | 'api'
  | 'firestore'
  | 'network'
  | 'unknown';

export type AppErrorOptions = {
  code?: string;
  status?: number;
  source?: AppErrorSource;
  cause?: unknown;
  context?: Record<string, unknown>;
};

export class AppError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly source: AppErrorSource;
  readonly context?: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code ?? 'app/unknown';
    this.status = options.status;
    this.source = options.source ?? 'unknown';
    this.context = options.context;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static fromFirebase(error: unknown, context?: Record<string, unknown>): AppError {
    if (error instanceof AppError) return error;

    const record = asRecord(error);
    const code = String(
      record?.code ??
        (error instanceof Error && 'code' in error
          ? (error as Error & { code?: string }).code
          : undefined) ??
        'auth/unknown',
    );
    const message = String(
      record?.message ??
        ((error instanceof Error ? error.message : '') || 'Authentication failed'),
    );
    const source: AppErrorSource =
      code.startsWith('firestore/') || code === 'permission-denied'
        ? 'firestore'
        : code.startsWith('auth/') || code.startsWith('storage/')
          ? 'auth'
          : 'firebase';

    return new AppError(message, {
      code,
      source,
      cause: error,
      context,
    });
  }

  static fromApi(
    message: string,
    status?: number,
    code = 'api/request-failed',
    cause?: unknown,
  ): AppError {
    return new AppError(message, {
      code,
      status,
      source: 'api',
      cause,
    });
  }

  static fromFirestore(
    message: string,
    context: Record<string, unknown>,
    cause?: unknown,
  ): AppError {
    return new AppError(message, {
      code: 'firestore/operation-failed',
      source: 'firestore',
      context,
      cause,
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function isDomEvent(value: unknown): value is Event {
  return typeof Event !== 'undefined' && value instanceof Event;
}

/**
 * Coerce any thrown/rejected value into a proper AppError instance.
 * Never return or rethrow raw objects.
 */
export function normalizeError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred',
): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error) {
    const code =
      'code' in error && typeof (error as Error & { code?: string }).code === 'string'
        ? (error as Error & { code: string }).code
        : undefined;

    if (
      code?.startsWith('auth/') ||
      code?.startsWith('firestore/') ||
      code === 'permission-denied' ||
      code?.startsWith('storage/')
    ) {
      return AppError.fromFirebase(error);
    }

    return new AppError(error.message || fallbackMessage, {
      code: code ?? 'app/error',
      cause: error,
    });
  }

  if (typeof error === 'string') {
    return new AppError(error, { code: 'app/string-error' });
  }

  if (isDomEvent(error)) {
    return new AppError(fallbackMessage, {
      code: 'network/script-load-failed',
      source: 'network',
      cause: error,
    });
  }

  const record = asRecord(error);
  if (record) {
    const message = String(
      record.message ?? record.error ?? record.statusText ?? fallbackMessage,
    );
    const code = String(record.code ?? 'app/object-error');
    const status =
      typeof record.status === 'number' ? record.status : undefined;

    let source: AppErrorSource = 'unknown';
    if (code.startsWith('auth/') || code.startsWith('storage/')) {
      source = 'auth';
    } else if (code.startsWith('firestore/') || code === 'permission-denied') {
      source = 'firestore';
    } else if (status !== undefined || code.startsWith('api/')) {
      source = 'api';
    }

    return new AppError(message, {
      code,
      status,
      source,
      cause: error,
      context: record,
    });
  }

  return new AppError(fallbackMessage, {
    code: 'app/unknown',
    cause: error,
  });
}

export function ensureError(error: unknown, fallbackMessage?: string): Error {
  return normalizeError(error, fallbackMessage);
}
