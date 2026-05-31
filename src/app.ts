import express from "express";

import { isAppError } from "./lib/errors";
import { sendError } from "./lib/responses";
import { adminRouter } from "./modules/admin";
import { analyticsRouter } from "./modules/analytics";
import { authRouter } from "./modules/auth";
import { driversRouter } from "./modules/drivers";
import { menuRouter } from "./modules/menu";
import { notificationsRouter } from "./modules/notifications";
import { ordersRouter } from "./modules/orders";
import { paymentsRouter } from "./modules/payments";
import { promotionsRouter } from "./modules/promotions";
import { restaurantsRouter } from "./modules/restaurants";
import { reviewsRouter } from "./modules/reviews";
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
  app.use("/restaurants/:restaurantId/menu", menuRouter);
  app.use("/orders", ordersRouter);
  app.use("/payments", paymentsRouter);
  app.use("/drivers", driversRouter);
  app.use(reviewsRouter);
  app.use("/promotions", promotionsRouter);
  app.use("/notifications", notificationsRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/admin", adminRouter);

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
