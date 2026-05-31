import { Router } from "express";

import { AppError, isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import {
  confirmPaymentSchema,
  payoutQuerySchema,
  refundPaymentSchema,
} from "./payments.schema";
import { paymentsService } from "./payments.service";

const router = Router();

router.post(
  "/confirm",
  requireAuth,
  requireRole(["customer"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const parsed = confirmPaymentSchema.safeParse(request.body);
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

      const order = paymentsService.confirm(parsed.data, request.auth);
      return sendSuccess(response, 200, {
        payment_status: order.payment.status,
        order_status: order.status,
      });
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.post(
  "/refund",
  requireAuth,
  requireRole(["admin"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const parsed = refundPaymentSchema.safeParse(request.body);
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

      const result = paymentsService.refund(parsed.data, request.auth);
      return sendSuccess(response, 200, result);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.get(
  "/payouts",
  requireAuth,
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const parsed = payoutQuerySchema.safeParse(request.query);
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

      const result = paymentsService.payouts(parsed.data, request.auth);
      return sendSuccess(response, 200, result.data, result.meta as any);
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
