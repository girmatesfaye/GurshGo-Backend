import { Router } from "express";

import { AppError, isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import {
  driverJobRespondSchema,
  driverLocationSchema,
  driverStatusSchema,
  nearbyDriversQuerySchema,
} from "./drivers.schema";
import { driversService } from "./drivers.service";

const router = Router();

router.get(
  "/me",
  requireAuth,
  requireRole(["driver"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const data = driversService.getMe(request.auth);
      return sendSuccess(response, 200, data);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.patch(
  "/me/status",
  requireAuth,
  requireRole(["driver"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const parsed = driverStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return sendError(
          response,
          400,
          "VALIDATION_ERROR",
          issue.message,
          issue.path.length ? String(issue.path[0]) : null,
        );
      }

      const data = driversService.updateStatus(parsed.data, request.auth);
      return sendSuccess(response, 200, data);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.patch(
  "/me/location",
  requireAuth,
  requireRole(["driver"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const parsed = driverLocationSchema.safeParse(request.body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return sendError(
          response,
          400,
          "VALIDATION_ERROR",
          issue.message,
          issue.path.length ? String(issue.path[0]) : null,
        );
      }

      const data = driversService.updateLocation(parsed.data, request.auth);
      return sendSuccess(response, 200, data);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.post(
  "/me/job/respond",
  requireAuth,
  requireRole(["driver"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const parsed = driverJobRespondSchema.safeParse(request.body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return sendError(
          response,
          400,
          "VALIDATION_ERROR",
          issue.message,
          issue.path.length ? String(issue.path[0]) : null,
        );
      }

      const data = driversService.respondToJob(parsed.data, request.auth);
      return sendSuccess(response, 200, data);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.get(
  "/nearby",
  requireAuth,
  requireRole(["admin"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const parsed = nearbyDriversQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return sendError(
          response,
          400,
          "VALIDATION_ERROR",
          issue.message,
          issue.path.length ? String(issue.path[0]) : null,
        );
      }

      const data = driversService.nearby(parsed.data);
      return sendSuccess(response, 200, data);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

function handleError(error: unknown, response: any) {
  if (isAppError(error)) {
    return sendError(
      response,
      error.statusCode,
      error.code,
      error.message,
      error.field,
    );
  }

  if (error instanceof Error) {
    return sendError(response, 500, "SERVER_ERROR", error.message);
  }

  return sendError(
    response,
    500,
    "SERVER_ERROR",
    "An unexpected error occurred",
  );
}

export default router;
