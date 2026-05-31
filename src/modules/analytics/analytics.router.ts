import { Router } from "express";

import { AppError, isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import { summaryQuerySchema } from "./analytics.schema";
import { analyticsService } from "./analytics.service";

const router = Router();

router.get(
  "/summary",
  requireAuth,
  requireRole(["merchant"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth)
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      const parsed = summaryQuerySchema.safeParse(request.query);
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

      const res = analyticsService.summaryForMerchant(
        request.auth.userId,
        parsed.data.period,
        parsed.data.from,
        parsed.data.to,
      );
      return sendSuccess(response, 200, res);
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
