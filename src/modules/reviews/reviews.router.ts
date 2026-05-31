import { Router } from "express";

import { AppError, isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import { reviewsService } from "./reviews.service";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireRole(["customer"]),
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new AppError(401, "TOKEN_MISSING", "Missing authorization token");
      }

      const body = request.body as {
        order_id?: string;
        restaurant_rating?: number;
        driver_rating?: number;
        comment?: string;
      };

      if (!body.order_id || typeof body.order_id !== "string") {
        return sendError(
          response,
          400,
          "VALIDATION_ERROR",
          "Order id is required",
          "order_id",
        );
      }
      if (typeof body.restaurant_rating !== "number") {
        return sendError(
          response,
          400,
          "VALIDATION_ERROR",
          "Restaurant rating is required",
          "restaurant_rating",
        );
      }
      if (typeof body.driver_rating !== "number") {
        return sendError(
          response,
          400,
          "VALIDATION_ERROR",
          "Driver rating is required",
          "driver_rating",
        );
      }

      const created = reviewsService.create(
        {
          order_id: body.order_id,
          restaurant_rating: body.restaurant_rating,
          driver_rating: body.driver_rating,
          comment: body.comment,
        },
        request.auth,
      );

      return sendSuccess(response, 201, created);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.get("/restaurants/:id/reviews", (request, response) => {
  try {
    const page = request.query.page ? Number(request.query.page) : 1;
    const perPage = request.query.per_page
      ? Number(request.query.per_page)
      : 20;
    const restaurantId = String(request.params.id);
    const result = reviewsService.listByRestaurant(restaurantId, page, perPage);
    return sendSuccess(response, 200, result.data, result.meta as any);
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
