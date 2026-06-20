import dotenv from "dotenv";
import mongoose from "mongoose";
import {DB_NAME} from "./constants.js";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path: "./.env"
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`App is listening on port ${process.env.PORT || 8000}`);
    })
    app.on("error", (error)=>{
        console.log("ERROR: ", error);
        throw error
    })
})
.catch((error) => {
    console.log("MongoDB connection failed: ", error);
})
