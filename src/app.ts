import express from "express";

import { isAppError } from "./lib/errors";
import { sendError } from "./lib/responses";
import { authRouter } from "./modules/auth";
import { restaurantsRouter } from "./modules/restaurants";
import { usersRouter } from "./modules/users";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/restaurants", restaurantsRouter);

  app.use((_request, response) => {
    sendError(response, 404, "NOT_FOUND", "Route not found");
  });

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      if (isAppError(error)) {
        return sendError(
          response,
          error.statusCode,
          error.code,
          error.message,
          error.field,
        );
      }

      if (
        error instanceof Error &&
        (error.message === "Token expired" ||
          error.message === "Invalid token signature" ||
          error.message === "Invalid token format")
      ) {
        const code =
          error.message === "Token expired" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
        const message =
          error.message === "Token expired" ? "Token expired" : "Invalid token";
        return sendError(response, 401, code, message);
      }

      return sendError(
        response,
        500,
        "SERVER_ERROR",
        "An unexpected error occurred",
      );
    },
  );

  return app;
}
