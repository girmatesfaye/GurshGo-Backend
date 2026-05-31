import type { Response } from "express";
import { Router } from "express";

import { isAppError } from "../../lib/errors";
import { sendError, sendSuccess } from "../../lib/responses";
import { requireAuth, type AuthenticatedRequest } from "./auth.middleware";
import {
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  registerSchema,
} from "./auth.schema";
import { authService } from "./auth.service";

const router = Router();

router.post("/register", async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);
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
    const result = await authService.register(parsed.data);
    return sendSuccess(response, 201, result);
  } catch (error) {
    return handleAuthError(error, response);
  }
});

router.post("/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
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
    const result = await authService.login(parsed.data);
    return sendSuccess(response, 200, result);
  } catch (error) {
    return handleAuthError(error, response);
  }
});

router.post("/otp/send", async (request, response) => {
  const parsed = otpSendSchema.safeParse(request.body);
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
    const result = await authService.sendOtp(parsed.data);
    return sendSuccess(response, 200, result);
  } catch (error) {
    return handleAuthError(error, response);
  }
});

router.post("/otp/verify", async (request, response) => {
  const parsed = otpVerifySchema.safeParse(request.body);
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
    const result = await authService.verifyOtp(parsed.data);
    return sendSuccess(response, 200, result);
  } catch (error) {
    return handleAuthError(error, response);
  }
});

router.post(
  "/refresh",
  requireAuth,
  async (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new Error("Missing auth context");
      }

      const result = await authService.refresh(request.auth);
      return sendSuccess(response, 200, result);
    } catch (error) {
      return handleAuthError(error, response);
    }
  },
);

router.post(
  "/logout",
  requireAuth,
  async (request: AuthenticatedRequest, response) => {
    try {
      if (!request.auth) {
        throw new Error("Missing auth context");
      }

      const result = await authService.logout(request.auth);
      return sendSuccess(response, 200, result);
    } catch (error) {
      return handleAuthError(error, response);
    }
  },
);

function handleAuthError(error: unknown, response: Response) {
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
    if (error.message === "Token expired") {
      return sendError(response, 401, "TOKEN_EXPIRED", "Token expired");
    }

    if (
      error.message === "Invalid token signature" ||
      error.message === "Invalid token format"
    ) {
      return sendError(response, 401, "TOKEN_INVALID", "Invalid token");
    }
  }

  return sendError(
    response,
    500,
    "SERVER_ERROR",
    "An unexpected error occurred",
  );
}

export default router;
