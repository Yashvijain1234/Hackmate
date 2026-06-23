import dotenv from "dotenv";
import http from "http";
import connectDB from "./src/db/index.js";
import app from "./app.js";
import { initSocket } from "./src/socket/index.js";

dotenv.config({
    path: "./.env",
});

const PORT = process.env.PORT || 8000;

connectDB()
    .then(() => {
        const server = http.createServer(app);

        // Attach the real-time Socket.io layer to the same HTTP server.
        initSocket(server);

        server.listen(PORT, () => {
            console.log(`⚙️  App is listening on port ${PORT}`);
            console.log(`🔌 Socket.io is ready for real-time events`);
        });

        server.on("error", (error) => {
            console.log("SERVER ERROR: ", error);
            throw error;
        });
    })
    .catch((error) => {
        console.log("MongoDB connection failed: ", error);
    });
