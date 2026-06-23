import axios from "axios";
import { Hackathon } from "../models/hackathon.model.js";

const DEVPOST_API = "https://devpost.com/api/hackathons";

const mapOpenState = (state) => {
    switch ((state || "").toLowerCase()) {
        case "open":
            return "Ongoing";
        case "ended":
            return "Completed";
        default:
            return "Upcoming";
    }
};

const mapMode = (location = "") =>
    /online|virtual/i.test(location) ? "Online" : "Offline";

// Devpost shows date ranges like "Mar 01 - Apr 15, 2026" or "Apr 15, 2026".
const parseDevpostDates = (raw) => {
    const fallbackStart = new Date();
    const fallbackEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    if (!raw) return { startDate: fallbackStart, endDate: fallbackEnd };

    const yearMatch = raw.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
    const parts = raw.split("-").map((p) => p.trim());

    const toDate = (segment) => {
        const hasYear = /\d{4}/.test(segment);
        const d = new Date(hasYear ? segment : `${segment}, ${year}`);
        return isNaN(d.getTime()) ? null : d;
    };

    if (parts.length === 2) {
        const start = toDate(parts[0]) || fallbackStart;
        const end = toDate(parts[1]) || fallbackEnd;
        return { startDate: start, endDate: end };
    }
    const single = toDate(parts[0]) || fallbackStart;
    return { startDate: single, endDate: single };
};

const normalizeDevpost = (item) => {
    const { startDate, endDate } = parseDevpostDates(item.submission_period_dates);
    return {
        name: item.title,
        description:
            item.tagline ||
            `${item.title} — imported from Devpost.${item.prize_amount ? ` Prizes: ${item.prize_amount.replace(/<[^>]+>/g, "")}.` : ""}`,
        organizer: item.organization_name || "Devpost",
        mode: mapMode(item.displayed_location?.location),
        location: item.displayed_location?.location || "Online",
        startDate,
        endDate,
        themes: (item.themes || []).map((t) => t.name).filter(Boolean),
        externalLink: item.url,
        status: mapOpenState(item.open_state),
    };
};

/**
 * Fetch hackathons from Devpost and upsert them (deduped by externalLink).
 * Returns counts. Throws on network/parsing failure so callers can decide.
 */
export const ingestFromDevpost = async ({ pages = 1 } = {}) => {
    let created = 0;
    let updated = 0;

    for (let page = 1; page <= pages; page++) {
        const { data } = await axios.get(DEVPOST_API, {
            params: { page },
            headers: { "User-Agent": "HackMate/1.0 (+ingestion)" },
            timeout: 15000,
        });

        const items = data?.hackathons || [];
        for (const item of items) {
            if (!item.title || !item.url) continue;
            const doc = normalizeDevpost(item);
            const result = await Hackathon.updateOne(
                { externalLink: doc.externalLink },
                { $set: doc },
                { upsert: true }
            );
            if (result.upsertedCount) created++;
            else if (result.modifiedCount) updated++;
        }
    }

    return { created, updated };
};

// A small curated fallback set so the app has data even without network access.
export const sampleHackathons = [
    {
        name: "AI for Good Global Hackathon",
        description:
            "Build AI-powered solutions that tackle real-world social and environmental challenges.",
        organizer: "MLH",
        mode: "Online",
        location: "Online",
        startDate: new Date(Date.now() + 7 * 86400000),
        endDate: new Date(Date.now() + 9 * 86400000),
        registrationDeadline: new Date(Date.now() + 6 * 86400000),
        themes: ["AI/ML", "Social Good", "Open Innovation"],
        minTeamSize: 1,
        maxTeamSize: 4,
        externalLink: "https://mlh.io/seasons",
        status: "Upcoming",
    },
    {
        name: "FinTech Future Hack",
        description:
            "Reimagine banking, payments, and personal finance with cutting-edge technology.",
        organizer: "Devpost",
        mode: "Hybrid",
        location: "Bengaluru, India",
        startDate: new Date(Date.now() + 14 * 86400000),
        endDate: new Date(Date.now() + 16 * 86400000),
        registrationDeadline: new Date(Date.now() + 12 * 86400000),
        themes: ["FinTech", "Blockchain", "Web"],
        minTeamSize: 2,
        maxTeamSize: 5,
        externalLink: "https://devpost.com/hackathons",
        status: "Upcoming",
    },
    {
        name: "Web3 Builders Weekend",
        description:
            "A 48-hour sprint to ship decentralized apps, smart contracts, and on-chain tooling.",
        organizer: "ETHGlobal",
        mode: "Offline",
        location: "Remote / NYC",
        startDate: new Date(Date.now() + 21 * 86400000),
        endDate: new Date(Date.now() + 23 * 86400000),
        themes: ["Web3", "Blockchain", "Crypto"],
        minTeamSize: 1,
        maxTeamSize: 4,
        externalLink: "https://ethglobal.com/events",
        status: "Upcoming",
    },
];
