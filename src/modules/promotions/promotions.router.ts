import { Router } from "express";

import { AppError, isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import {
  createPromotionSchema,
  listPromotionsQuerySchema,
  validatePromotionSchema,
} from "./promotions.schema";
import { promotionsService } from "./promotions.service";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireRole(["merchant"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth)
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      const parsed = createPromotionSchema.safeParse(request.body);
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

      const created = promotionsService.create(parsed.data, request.auth);
      return sendSuccess(response, 201, created);
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
  "/validate",
  requireAuth,
  requireRole(["customer"]),
  (request: AuthenticatedRequest, response) => {
    try {
      const parsed = validatePromotionSchema.safeParse(request.body);
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

      const result = promotionsService.validate(parsed.data);
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

router.get(
  "/",
  requireAuth,
  requireRole(["merchant"]),
  (request: AuthenticatedRequest, response) => {
    try {
      const parsed = listPromotionsQuerySchema.safeParse(request.query);
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
      if (!request.auth)
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      const res = promotionsService.listForMerchant(
        request.auth,
        parsed.data.page,
        parsed.data.per_page,
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
  },
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(["merchant"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth)
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      const promoId = String(request.params.id);
      const updated = promotionsService.deactivate(promoId, request.auth);
      return sendSuccess(response, 200, updated);
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
