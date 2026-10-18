import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.path}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    // Mongoose duplicate key error (e.g. duplicate email)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || "field";
      error = new ApiError(409, `${field} already in use.`, [
        { field, message: `${field} already in use.` },
      ]);
    } else if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      error = new ApiError(400, "Validation failed", errors);
    } else if (error.name === "CastError") {
      error = new ApiError(400, "Invalid value.", [
        { field: error.path, message: "Invalid value." },
      ]);
    } else if (error.type === "entity.parse.failed") {
      error = new ApiError(400, "Malformed JSON request body.");
    } else if (error.type === "entity.too.large") {
      error = new ApiError(413, "Request body is too large.");
    } else {
      const statusCode = Number(error.status || error.statusCode);
      if (statusCode >= 400 && statusCode < 500) {
        error = new ApiError(statusCode, error.message || "Invalid request.");
      } else {
        error = new ApiError(500, "Internal server error");
      }
    }
  }

  const exposeDetails = env.nodeEnv === "development";
  if (error.statusCode >= 500) {
    console.error("API server error:", {
      name: err.name,
      code: err.code,
      method: req.method,
      path: req.path,
    });
  }
  const response = {
    success: false,
    message: error.statusCode >= 500 && !exposeDetails ? "Internal server error" : error.message,
    errors: error.statusCode >= 500 && !exposeDetails ? [] : error.errors || [],
  };

  if (exposeDetails) {
    response.stack = err.stack || error.stack;
  }

  res.status(error.statusCode || 500).json(response);
};
