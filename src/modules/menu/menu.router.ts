import { Router } from "express";

import { AppError, isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import {
  menuCategoryCreateSchema,
  menuCategoryUpdateSchema,
  menuItemCreateSchema,
  menuItemUpdateSchema,
} from "./menu.schema";
import { menuService } from "./menu.service";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole(["merchant"]));

router.post("/categories", (request: AuthenticatedRequest, response) => {
  try {
    if (!request.auth) {
      throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
    }

    const parsed = menuCategoryCreateSchema.safeParse(request.body);
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

    const restaurantId = String(
      request.params.restaurantId ?? request.params.id,
    );
    const category = menuService.createCategory(
      restaurantId,
      parsed.data,
      request.auth,
    );
    return sendSuccess(response, 201, category);
  } catch (error) {
    return handleError(error, response);
  }
});

router.patch(
  "/categories/:category_id",
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const parsed = menuCategoryUpdateSchema.safeParse(request.body);
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

      const restaurantId = String(
        request.params.restaurantId ?? request.params.id,
      );
      const category = menuService.updateCategory(
        restaurantId,
        String(request.params.category_id),
        parsed.data,
        request.auth,
      );
      return sendSuccess(response, 200, category);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.post("/items", (request: AuthenticatedRequest, response) => {
  try {
    if (!request.auth) {
      throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
    }

    const parsed = menuItemCreateSchema.safeParse(request.body);
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

    const restaurantId = String(
      request.params.restaurantId ?? request.params.id,
    );
    const item = menuService.createItem(
      restaurantId,
      parsed.data,
      request.auth,
    );
    return sendSuccess(response, 201, item);
  } catch (error) {
    return handleError(error, response);
  }
});

router.patch("/items/:item_id", (request: AuthenticatedRequest, response) => {
  try {
    if (!request.auth) {
      throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
    }

    const parsed = menuItemUpdateSchema.safeParse(request.body);
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

    const restaurantId = String(
      request.params.restaurantId ?? request.params.id,
    );
    const item = menuService.updateItem(
      restaurantId,
      String(request.params.item_id),
      parsed.data,
      request.auth,
    );
    return sendSuccess(response, 200, item);
  } catch (error) {
    return handleError(error, response);
  }
});

router.delete("/items/:item_id", (request: AuthenticatedRequest, response) => {
  try {
    if (!request.auth) {
      throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
    }

    const restaurantId = String(
      request.params.restaurantId ?? request.params.id,
    );
    const result = menuService.deleteItem(
      restaurantId,
      String(request.params.item_id),
      request.auth,
    );
    return sendSuccess(response, 200, result);
  } catch (error) {
    return handleError(error, response);
  }
});

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
