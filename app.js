import cookieParser from "cookie-parser";
import express, { urlencoded } from "express";
import cors from "cors";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "*",
        credentials: true,
    })
);
app.use(express.json({ limit: "16kb" }));
app.use(urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Health check
app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ success: true, message: "HackMate API is healthy" });
});

// Route imports
import userRouter from "./src/routes/user.routes.js";
import hackathonRouter from "./src/routes/hackathon.routes.js";
import teamRouter from "./src/routes/team.routes.js";
import joinRequestRouter from "./src/routes/joinRequest.routes.js";
import { errorHandler } from "./src/middlewares/error.middleware.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/hackathons", hackathonRouter);
app.use("/api/v1/teams", teamRouter);
app.use("/api/v1/join-requests", joinRequestRouter);

// 404 fallback
app.use((req, res) => {
    res.status(404).json({
        success: false,
        status: 404,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
