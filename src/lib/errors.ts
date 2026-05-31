export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly field: string | null;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    field: string | null = null,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
