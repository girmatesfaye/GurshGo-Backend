import { Router } from "express";

import { AppError, isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import {
  listNotificationsQuerySchema,
  markReadSchema,
  registerDeviceSchema,
} from "./notifications.schema";
import { notificationsService } from "./notifications.service";

const router = Router();

router.get("/", requireAuth, (request: AuthenticatedRequest, response) => {
  try {
    if (!request.auth)
      throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
    const parsed = listNotificationsQuerySchema.safeParse(request.query);
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

    const res = notificationsService.listForUser(
      request.auth.userId,
      parsed.data.page,
      parsed.data.per_page,
      parsed.data.is_read,
    );
    return sendSuccess(response, 200, res.data, res.meta as any);
  } catch (error) {
    if (isAppError(error))
      return sendError(
        response,
        error.statusCode,
        error.code,
        error.message,
        error.field,
      );
    if (error instanceof Error)
      return sendError(response, 500, "SERVER_ERROR", error.message);
    return sendError(
      response,
      500,
      "SERVER_ERROR",
      "An unexpected error occurred",
    );
  }
});

router.patch(
  "/read",
  requireAuth,
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth)
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      const parsed = markReadSchema.safeParse(request.body);
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

      const result = notificationsService.markRead(
        request.auth.userId,
        parsed.data.notification_ids,
        parsed.data.mark_all,
      );
      return sendSuccess(response, 200, result);
    } catch (error) {
      if (isAppError(error))
        return sendError(
          response,
          error.statusCode,
          error.code,
          error.message,
          error.field,
        );
      if (error instanceof Error)
        return sendError(response, 500, "SERVER_ERROR", error.message);
      return sendError(
        response,
        500,
        "SERVER_ERROR",
        "An unexpected error occurred",
      );
    }
  },
);

router.post(
  "/device",
  requireAuth,
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth)
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      const parsed = registerDeviceSchema.safeParse(request.body);
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

      const res = notificationsService.registerDevice(
        request.auth.userId,
        parsed.data.token,
        parsed.data.platform,
      );
      return sendSuccess(response, 201, res);
    } catch (error) {
      if (isAppError(error))
        return sendError(
          response,
          error.statusCode,
          error.code,
          error.message,
          error.field,
        );
      if (error instanceof Error)
        return sendError(response, 500, "SERVER_ERROR", error.message);
      return sendError(
        response,
        500,
        "SERVER_ERROR",
        "An unexpected error occurred",
      );
    }
  },
);

export default router;
