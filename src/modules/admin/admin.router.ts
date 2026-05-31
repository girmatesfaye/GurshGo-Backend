import { Router } from "express";

import { AppError, isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import {
  forceUpdateOrderSchema,
  listOrdersQuerySchema,
  listUsersQuerySchema,
  metricsQuerySchema,
  updateUserSchema,
} from "./admin.schema";
import { adminService } from "./admin.service";

const router = Router();

router.get(
  "/orders",
  requireAuth,
  requireRole(["admin"]),
  (request: AuthenticatedRequest, response) => {
    try {
      const parsed = listOrdersQuerySchema.safeParse(request.query);
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

      const res = adminService.listOrders(parsed.data);
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

router.patch(
  "/orders/:id/status",
  requireAuth,
  requireRole(["admin"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth)
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      const parsed = forceUpdateOrderSchema.safeParse(request.body);
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

      const updated = adminService.forceUpdateOrderStatus(
        String(request.params.id),
        parsed.data,
        request.auth,
      );
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

router.get(
  "/users",
  requireAuth,
  requireRole(["admin"]),
  (request: AuthenticatedRequest, response) => {
    try {
      const parsed = listUsersQuerySchema.safeParse(request.query);
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
      const res = adminService.listUsers(
        parsed.data.q,
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

router.patch(
  "/users/:id",
  requireAuth,
  requireRole(["admin"]),
  (request: AuthenticatedRequest, response) => {
    try {
      const parsed = updateUserSchema.safeParse(request.body);
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
      const res = adminService.updateUser(
        String(request.params.id),
        parsed.data as any,
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

router.post(
  "/payouts/process",
  requireAuth,
  requireRole(["admin"]),
  (request: AuthenticatedRequest, response) => {
    try {
      const res = adminService.processPayouts();
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

router.get(
  "/metrics",
  requireAuth,
  requireRole(["admin"]),
  (request: AuthenticatedRequest, response) => {
    try {
      const parsed = metricsQuerySchema.safeParse(request.query);
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
      const res = adminService.metrics(
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
