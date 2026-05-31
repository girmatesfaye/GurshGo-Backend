import { randomUUID } from "node:crypto";

import { AppError } from "../../lib/errors";
import { getUserById } from "../auth/auth.store";
import type { AuthContext } from "../auth/auth.types";
import {
  ensureDriverRecord,
  updateDriverRecord,
} from "../drivers/drivers.store";
import { getOrder } from "../orders/orders.store";
import {
  getRestaurant,
  updateRestaurant,
} from "../restaurants/restaurants.store";

type ReviewRecord = {
  id: string;
  order_id: string;
  restaurant_id: string;
  customer_id: string;
  driver_id: string | null;
  restaurant_rating: number;
  driver_rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

type RestaurantReviewResponse = {
  id: string;
  order_id: string;
  restaurant_rating: number;
  driver_rating: number;
  comment: string | null;
  reviewer_name: string;
  reviewer_avatar_initial: string;
  created_at: string;
};

type ReviewInput = {
  order_id: string;
  restaurant_rating: number;
  driver_rating: number;
  comment?: string | null;
};

type ReviewsPage = {
  data: RestaurantReviewResponse[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
};

const reviewsByOrder = new Map<string, ReviewRecord>();

function roundRating(value: number) {
  return Math.round(value * 10) / 10;
}

function average(numbers: number[]) {
  if (numbers.length === 0) return 0;
  return roundRating(
    numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
  );
}

function getReviewerName(customerId: string) {
  return getUserById(customerId)?.name ?? "Customer";
}

function toDisplayName(fullName: string) {
  return fullName.split(/\s+/)[0] || fullName || "Customer";
}

function updateAggregates(restaurantId: string, driverId: string | null) {
  const restaurantReviews = Array.from(reviewsByOrder.values()).filter(
    (review) => review.restaurant_id === restaurantId,
  );

  const restaurantRating = average(
    restaurantReviews.map((review) => review.restaurant_rating),
  );

  updateRestaurant(restaurantId, {
    rating: restaurantRating,
    review_count: restaurantReviews.length,
  });

  if (driverId) {
    const driverReviews = Array.from(reviewsByOrder.values()).filter(
      (review) => review.driver_id === driverId,
    );
    const driverRating = average(
      driverReviews.map((review) => review.driver_rating),
    );
    ensureDriverRecord(driverId);
    updateDriverRecord(driverId, { rating: driverRating });
  }
}

export const reviewsService = {
  create(input: ReviewInput, auth: AuthContext) {
    const order = getOrder(input.order_id);
    if (!order) {
      throw new AppError(404, "ORDER_NOT_FOUND", "No order found with that ID");
    }

    if (reviewsByOrder.has(order.id)) {
      throw new AppError(
        409,
        "REVIEW_EXISTS",
        "A review already exists for this order",
      );
    }

    if (order.status !== "DELIVERED") {
      throw new AppError(
        422,
        "ORDER_NOT_DELIVERED",
        "Order must be delivered before reviewing",
      );
    }

    if (order.customer_id !== auth.userId) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "You do not have access to this order",
      );
    }

    if (input.restaurant_rating < 1 || input.restaurant_rating > 5) {
      throw new AppError(
        422,
        "VALIDATION_ERROR",
        "Restaurant rating must be between 1 and 5",
        "restaurant_rating",
      );
    }

    if (input.driver_rating < 1 || input.driver_rating > 5) {
      throw new AppError(
        422,
        "VALIDATION_ERROR",
        "Driver rating must be between 1 and 5",
        "driver_rating",
      );
    }

    const review: ReviewRecord = {
      id: randomUUID(),
      order_id: order.id,
      restaurant_id: order.restaurant_id,
      customer_id: auth.userId,
      driver_id: order.driver_id,
      restaurant_rating: input.restaurant_rating,
      driver_rating: input.driver_rating,
      comment: input.comment?.trim() ? input.comment.trim() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    reviewsByOrder.set(order.id, review);
    updateAggregates(order.restaurant_id, order.driver_id);

    return {
      id: review.id,
      order_id: review.order_id,
      restaurant_id: review.restaurant_id,
      customer_id: review.customer_id,
      driver_id: review.driver_id,
      restaurant_rating: review.restaurant_rating,
      driver_rating: review.driver_rating,
      comment: review.comment,
      created_at: review.created_at,
    };
  },

  listByRestaurant(
    restaurantId: string,
    page: number,
    perPage: number,
  ): ReviewsPage {
    const restaurant = getRestaurant(restaurantId);
    if (!restaurant) {
      throw new AppError(
        404,
        "RESTAURANT_NOT_FOUND",
        "No restaurant found with that ID",
      );
    }

    const reviews = Array.from(reviewsByOrder.values())
      .filter((review) => review.restaurant_id === restaurantId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));

    const total = reviews.length;
    const pageItems = reviews
      .slice((page - 1) * perPage, (page - 1) * perPage + perPage)
      .map((review) => {
        const firstName = toDisplayName(getReviewerName(review.customer_id));
        return {
          id: review.id,
          order_id: review.order_id,
          restaurant_rating: review.restaurant_rating,
          driver_rating: review.driver_rating,
          comment: review.comment,
          reviewer_name: firstName,
          reviewer_avatar_initial: firstName.charAt(0).toUpperCase(),
          created_at: review.created_at,
        };
      });

    return {
      data: pageItems,
      meta: {
        page,
        per_page: perPage,
        total,
      },
    };
  },
};
