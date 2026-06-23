import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Hackathon } from "../models/hackathon.model.js";
import { ingestFromDevpost } from "../services/hackathonIngest.js";

const parseList = (value) =>
    Array.isArray(value)
        ? value
        : typeof value === "string" && value.length
          ? value.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;

const createHackathon = asyncHandler(async (req, res) => {
    const { name, description, startDate, endDate } = req.body;
    if (!name || !description || !startDate || !endDate) {
        throw new ApiError(
            400,
            "name, description, startDate and endDate are required"
        );
    }

    const hackathon = await Hackathon.create({
        ...req.body,
        themes: parseList(req.body.themes),
        addedBy: req.user._id,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, "Hackathon created", hackathon));
});

// Browse / discovery with filtering, search, sorting and pagination.
const getHackathons = asyncHandler(async (req, res) => {
    const {
        q,
        theme,
        mode,
        status,
        sort = "startDate",
        order = "asc",
        page = 1,
        limit = 12,
    } = req.query;

    const filter = {};
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { organizer: { $regex: q, $options: "i" } },
        ];
    }
    if (theme) filter.themes = { $in: theme.split(",").map((t) => t.trim()) };
    if (mode) filter.mode = mode;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sort]: order === "desc" ? -1 : 1 };

    const [hackathons, total] = await Promise.all([
        Hackathon.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit))
            .populate("addedBy", "userName avatar"),
        Hackathon.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Hackathons fetched", {
            hackathons,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        })
    );
});

const getHackathonById = asyncHandler(async (req, res) => {
    const hackathon = await Hackathon.findById(req.params.id).populate(
        "addedBy",
        "userName avatar"
    );
    if (!hackathon) throw new ApiError(404, "Hackathon not found");

    return res
        .status(200)
        .json(new ApiResponse(200, "Hackathon fetched", hackathon));
});

const updateHackathon = asyncHandler(async (req, res) => {
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) throw new ApiError(404, "Hackathon not found");

    if (
        hackathon.addedBy &&
        hackathon.addedBy.toString() !== req.user._id.toString()
    ) {
        throw new ApiError(403, "You can only edit hackathons you added");
    }

    const updates = { ...req.body };
    if (updates.themes !== undefined) updates.themes = parseList(updates.themes);

    const updated = await Hackathon.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, "Hackathon updated", updated));
});

const deleteHackathon = asyncHandler(async (req, res) => {
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) throw new ApiError(404, "Hackathon not found");

    if (
        hackathon.addedBy &&
        hackathon.addedBy.toString() !== req.user._id.toString()
    ) {
        throw new ApiError(403, "You can only delete hackathons you added");
    }

    await hackathon.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, "Hackathon deleted", {}));
});

// Pull fresh hackathons from Devpost/MLH into the DB.
const ingestHackathons = asyncHandler(async (req, res) => {
    const pages = Math.min(Number(req.query.pages) || 1, 5);
    try {
        const result = await ingestFromDevpost({ pages });
        return res
            .status(200)
            .json(new ApiResponse(200, "Hackathons ingested", result));
    } catch (error) {
        throw new ApiError(
            502,
            `Ingestion failed: ${error.message}. Check network access to Devpost.`
        );
    }
});

export {
    createHackathon,
    getHackathons,
    getHackathonById,
    updateHackathon,
    deleteHackathon,
    ingestHackathons,
};
