import ApiError from "../utils/ApiError.js";

// Centralized error handler — converts thrown errors into consistent JSON.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || error.status || 500;
        const message = error.message || "Something went wrong";
        error = new ApiError(statusCode, message, error?.errors || [], err.stack);
    }

    // Handle common Mongoose errors with friendlier messages.
    if (err?.name === "ValidationError") {
        error.status = 400;
        error.message = Object.values(err.errors)
            .map((e) => e.message)
            .join(", ");
    }
    if (err?.code === 11000) {
        error.status = 409;
        error.message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(", ")}`;
    }
    if (err?.name === "CastError") {
        error.status = 400;
        error.message = `Invalid ${err.path}: ${err.value}`;
    }

    const statusCode = error.status || 500;

    return res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: error.message,
        errors: error.errors || [],
        ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
    });
};
