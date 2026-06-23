import mongoose from "mongoose";
import {DB_NAME} from "../../constants.js";

const connectDB = async () => {
    try {
        // Pass dbName as an option so it works regardless of whether the URI
        // already contains a path/query string (e.g. "...mongodb.net/?appName=..").
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: DB_NAME,
        })
        console.log(`MongoDB connected!! DB HOST: ${connectionInstance.connection.host} | DB: ${connectionInstance.connection.name}`)
    } catch (error) {
        console.log("MongoDB connection error: ", error);
        process.exit(1);
    }
}
export default connectDB;