import dotenv from "dotenv";
import connectDB from "../db/index.js";
import mongoose from "mongoose";
import { Hackathon } from "../models/hackathon.model.js";
import { ingestFromDevpost, sampleHackathons } from "./hackathonIngest.js";

dotenv.config({ path: "./.env" });

const seed = async () => {
    await connectDB();

    try {
        console.log("Attempting to ingest hackathons from Devpost...");
        const result = await ingestFromDevpost({ pages: 2 });
        console.log(
            `Devpost ingestion done. Created: ${result.created}, Updated: ${result.updated}`
        );
    } catch (error) {
        console.warn(
            "Devpost ingestion failed (network/parse). Falling back to sample data.",
            error.message
        );
        for (const h of sampleHackathons) {
            await Hackathon.updateOne(
                { externalLink: h.externalLink },
                { $set: h },
                { upsert: true }
            );
        }
        console.log(`Seeded ${sampleHackathons.length} sample hackathons.`);
    } finally {
        await mongoose.connection.close();
        console.log("Done. Connection closed.");
        process.exit(0);
    }
};

seed();
