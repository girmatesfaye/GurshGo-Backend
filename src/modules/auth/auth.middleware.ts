import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../lib/errors";
import { authService } from "./auth.service";
import type { AuthContext, UserRole } from "./auth.types";

export type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};

export function requireAuth(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
) {
  try {
    const token = authService.parseBearerToken(request.header("authorization"));
    const authenticated = authService.authenticate(token);
    request.auth = authenticated.auth;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      if (!allowedRoles.includes(request.auth.role)) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "You do not have access to this resource",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
