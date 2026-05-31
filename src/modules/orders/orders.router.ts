import { Router } from "express";

import { AppError, isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import {
  cancelOrderSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
} from "./orders.schema";
import { ordersService } from "./orders.service";

const router = Router();

router.post("/", requireAuth, (request: AuthenticatedRequest, response) => {
  try {
    if (!request.auth)
      throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
    if (request.auth.role !== "customer") {
      throw new AppError(403, "FORBIDDEN", "Only customers can place orders");
    }

    const parsed = createOrderSchema.safeParse(request.body);
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

    const order = ordersService.create(parsed.data, request.auth);
    return sendSuccess(response, 201, order);
  } catch (error) {
    return handleError(error, response);
  }
});

router.get("/", requireAuth, (request: AuthenticatedRequest, response) => {
  try {
    if (!request.auth)
      throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
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

    const result = ordersService.list(parsed.data, request.auth);
    return sendSuccess(response, 200, result.data, result.meta as any);
  } catch (error) {
    return handleError(error, response);
  }
});

router.get("/:id", requireAuth, (request: AuthenticatedRequest, response) => {
  try {
    if (!request.auth)
      throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
    const order = ordersService.get(String(request.params.id), request.auth);
    return sendSuccess(response, 200, order);
  } catch (error) {
    return handleError(error, response);
  }
});

router.patch(
  "/:id/status",
  requireAuth,
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth)
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      const parsed = updateOrderStatusSchema.safeParse(request.body);
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

      const order = ordersService.updateStatus(
        String(request.params.id),
        parsed.data,
        request.auth,
      );
      return sendSuccess(response, 200, order);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.post(
  "/:id/cancel",
  requireAuth,
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth)
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      const parsed = cancelOrderSchema.safeParse(request.body);
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

      const order = ordersService.cancel(
        String(request.params.id),
        parsed.data,
        request.auth,
      );
      return sendSuccess(response, 200, order);
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
