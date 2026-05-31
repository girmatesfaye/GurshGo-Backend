import { Router } from "express";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import {
  restaurantCreateSchema,
  restaurantUpdateSchema,
} from "./restaurants.schema";
import { restaurantsService } from "./restaurants.service";

const router = Router();

router.get("/", (request, response) => {
  try {
    const query: any = {};
    if (request.query.lat) query.lat = Number(request.query.lat);
    if (request.query.lng) query.lng = Number(request.query.lng);
    if (request.query.radius_km)
      query.radius_km = Number(request.query.radius_km);
    if (request.query.cuisine) query.cuisine = String(request.query.cuisine);
    if (request.query.is_open) query.is_open = request.query.is_open === "true";
    if (request.query.search) query.search = String(request.query.search);
    if (request.query.page) query.page = Number(request.query.page);
    if (request.query.per_page) query.per_page = Number(request.query.per_page);

    const result = restaurantsService.list(query);
    return sendSuccess(response, 200, result.data, result.meta as any);
  } catch (error) {
    return sendError(
      response,
      500,
      "SERVER_ERROR",
      "An unexpected error occurred",
    );
  }
});

router.get("/:id", (request, response) => {
  try {
    const restaurant = restaurantsService.get(String(request.params.id));
    return sendSuccess(response, 200, restaurant);
  } catch (error: any) {
    return sendError(
      response,
      error.statusCode ?? 500,
      error.code ?? "SERVER_ERROR",
      error.message ?? "An unexpected error occurred",
    );
  }
});

router.get("/:id/menu", (request, response) => {
  try {
    const menu = restaurantsService.getMenu(String(request.params.id));
    return sendSuccess(response, 200, menu);
  } catch (error: any) {
    return sendError(
      response,
      error.statusCode ?? 500,
      error.code ?? "SERVER_ERROR",
      error.message ?? "An unexpected error occurred",
    );
  }
});

// Create restaurant (merchant only)
router.post(
  "/",
  requireAuth,
  requireRole(["merchant"]),
  (request: AuthenticatedRequest, response) => {
    const parsed = restaurantCreateSchema.safeParse(request.body);
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

    try {
      const created = restaurantsService.create({
        ...parsed.data,
        owner_id: request.auth?.userId,
      } as any);
      return sendSuccess(response, 201, created);
    } catch (error: any) {
      return sendError(
        response,
        error.statusCode ?? 500,
        error.code ?? "SERVER_ERROR",
        error.message ?? "An unexpected error occurred",
      );
    }
  },
);

router.patch(
  "/:id",
  requireAuth,
  requireRole(["merchant"]),
  (request: AuthenticatedRequest, response) => {
    const parsed = restaurantUpdateSchema.safeParse(request.body);
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

    try {
      const updated = restaurantsService.update(
        String(request.params.id),
        parsed.data as any,
      );
      return sendSuccess(response, 200, updated);
    } catch (error: any) {
      return sendError(
        response,
        error.statusCode ?? 500,
        error.code ?? "SERVER_ERROR",
        error.message ?? "An unexpected error occurred",
      );
    }
  },
);

export default router;
