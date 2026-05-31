import { Router } from "express";
import { sendError, sendSuccess } from "../../lib/responses";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware";
import {
  addressCreateSchema,
  addressUpdateSchema,
  updateProfileSchema,
} from "./users.schema";
import { usersService } from "./users.service";

const router = Router();

router.get("/me", requireAuth, (request: AuthenticatedRequest, response) => {
  try {
    if (!request.auth) throw new Error("Missing auth context");
    const user = usersService.getProfile(request.auth.userId);
    return sendSuccess(response, 200, user);
  } catch (error) {
    return handleError(error, response);
  }
});

router.patch(
  "/me",
  requireAuth,
  async (request: AuthenticatedRequest, response) => {
    const parsed = updateProfileSchema.safeParse(request.body);
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
      if (!request.auth) throw new Error("Missing auth context");
      const updated = usersService.updateProfile(
        request.auth.userId,
        parsed.data,
      );
      return sendSuccess(response, 200, updated);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.get(
  "/me/addresses",
  requireAuth,
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) throw new Error("Missing auth context");
      const list = usersService.listAddresses(request.auth.userId);
      return sendSuccess(response, 200, list);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.post(
  "/me/addresses",
  requireAuth,
  (request: AuthenticatedRequest, response) => {
    const parsed = addressCreateSchema.safeParse(request.body);
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
      if (!request.auth) throw new Error("Missing auth context");
      const created = usersService.addAddress(request.auth.userId, parsed.data);
      return sendSuccess(response, 201, created);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.patch(
  "/me/addresses/:id",
  requireAuth,
  (request: AuthenticatedRequest, response) => {
    const parsed = addressUpdateSchema.safeParse(request.body);
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
      if (!request.auth) throw new Error("Missing auth context");
      const addressId = String(request.params.id);
      const updated = usersService.updateAddress(
        request.auth.userId,
        addressId,
        parsed.data,
      );
      return sendSuccess(response, 200, updated);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

router.delete(
  "/me/addresses/:id",
  requireAuth,
  (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) throw new Error("Missing auth context");
      const addressId = String(request.params.id);
      const result = usersService.deleteAddress(request.auth.userId, addressId);
      return sendSuccess(response, 200, result);
    } catch (error) {
      return handleError(error, response);
    }
  },
);

function handleError(
  error: unknown,
  response: ReturnType<(typeof router)["post"]> extends (
    ...args: any[]
  ) => infer TResult
    ? TResult
    : any,
) {
  // reuse auth error shape
  if (error instanceof Error) {
    // AppError handled by global handler; here we fallback
    return sendError(response as any, 400, "BAD_REQUEST", error.message);
  }

  return sendError(
    response as any,
    500,
    "SERVER_ERROR",
    "An unexpected error occurred",
  );
}

export default router;
