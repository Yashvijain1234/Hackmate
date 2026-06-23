import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

let io = null;

// Maps a userId -> Set of active socket ids (a user can have multiple tabs/devices)
const onlineUsers = new Map();

const addSocket = (userId, socketId) => {
    const id = userId.toString();
    if (!onlineUsers.has(id)) onlineUsers.set(id, new Set());
    onlineUsers.get(id).add(socketId);
};

const removeSocket = (userId, socketId) => {
    const id = userId.toString();
    const set = onlineUsers.get(id);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) onlineUsers.delete(id);
};

/**
 * Attach Socket.io to the existing HTTP server.
 */
export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            credentials: true,
        },
    });

    // Authenticate sockets using the JWT access token.
    io.use(async (socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace("Bearer ", "");

            if (!token) return next(new Error("Authentication error: no token"));

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const user = await User.findById(decoded?._id).select("_id userName");
            if (!user) return next(new Error("Authentication error: invalid user"));

            socket.userId = user._id.toString();
            socket.userName = user.userName;
            next();
        } catch (error) {
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        addSocket(socket.userId, socket.id);
        // Personal room for direct notifications.
        socket.join(socket.userId);

        // Team chat: join/leave a team room.
        socket.on("team:join", (teamId) => {
            if (teamId) socket.join(`team:${teamId}`);
        });
        socket.on("team:leave", (teamId) => {
            if (teamId) socket.leave(`team:${teamId}`);
        });

        // Real-time team chat message relay.
        socket.on("team:message", ({ teamId, message }) => {
            if (!teamId || !message) return;
            io.to(`team:${teamId}`).emit("team:message", {
                teamId,
                message,
                from: { _id: socket.userId, userName: socket.userName },
                sentAt: new Date(),
            });
        });

        socket.on("disconnect", () => {
            removeSocket(socket.userId, socket.id);
        });
    });

    return io;
};

export const getIO = () => io;

/** Emit an event to a specific user (all their connected sockets). */
export const emitToUser = (userId, event, payload) => {
    if (!io || !userId) return;
    io.to(userId.toString()).emit(event, payload);
};

/** Emit an event to everyone in a team room. */
export const emitToTeam = (teamId, event, payload) => {
    if (!io || !teamId) return;
    io.to(`team:${teamId.toString()}`).emit(event, payload);
};

export const isUserOnline = (userId) =>
    onlineUsers.has(userId?.toString());
