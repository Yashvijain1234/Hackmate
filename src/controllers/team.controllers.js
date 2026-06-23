import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Team } from "../models/team.model.js";
import { User } from "../models/user.model.js";
import { Hackathon } from "../models/hackathon.model.js";
import { emitToTeam } from "../socket/index.js";

const parseList = (value) =>
    Array.isArray(value)
        ? value
        : typeof value === "string" && value.length
          ? value.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;

const populateTeam = (query) =>
    query
        .populate("leader", "userName avatar experienceLevel")
        .populate("members.user", "userName avatar skills preferredRoles")
        .populate("hackathon", "name startDate endDate mode");

const createTeam = asyncHandler(async (req, res) => {
    const { name, hackathon, description, maxSize, requiredRoles, requiredSkills } =
        req.body;

    if (!name || !hackathon) {
        throw new ApiError(400, "Team name and hackathon are required");
    }

    const hackathonDoc = await Hackathon.findById(hackathon);
    if (!hackathonDoc) throw new ApiError(404, "Hackathon not found");

    const team = await Team.create({
        name,
        hackathon,
        leader: req.user._id,
        members: [{ user: req.user._id, role: "Leader" }],
        description,
        maxSize: maxSize || hackathonDoc.maxTeamSize || 4,
        requiredRoles: parseList(requiredRoles),
        requiredSkills: parseList(requiredSkills),
    });

    await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { teams: team._id },
    });

    const populated = await populateTeam(Team.findById(team._id));

    return res
        .status(201)
        .json(new ApiResponse(201, "Team created", populated));
});

const getTeams = asyncHandler(async (req, res) => {
    const {
        hackathon,
        isOpen,
        skill,
        role,
        q,
        page = 1,
        limit = 12,
    } = req.query;

    const filter = {};
    if (hackathon) filter.hackathon = hackathon;
    if (isOpen !== undefined) filter.isOpen = isOpen === "true";
    if (skill) filter.requiredSkills = { $in: skill.split(",").map((s) => s.trim()) };
    if (role) filter.requiredRoles = { $in: role.split(",").map((s) => s.trim()) };
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [teams, total] = await Promise.all([
        populateTeam(Team.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))),
        Team.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Teams fetched", {
            teams,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        })
    );
});

const getMyTeams = asyncHandler(async (req, res) => {
    const teams = await populateTeam(
        Team.find({ "members.user": req.user._id }).sort({ updatedAt: -1 })
    );
    return res
        .status(200)
        .json(new ApiResponse(200, "Your teams fetched", teams));
});

const getTeamById = asyncHandler(async (req, res) => {
    const team = await populateTeam(Team.findById(req.params.id));
    if (!team) throw new ApiError(404, "Team not found");

    return res.status(200).json(new ApiResponse(200, "Team fetched", team));
});

const isLeader = (team, userId) => team.leader.toString() === userId.toString();

const updateTeam = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);
    if (!team) throw new ApiError(404, "Team not found");
    if (!isLeader(team, req.user._id)) {
        throw new ApiError(403, "Only the team leader can update the team");
    }

    const allowed = [
        "name",
        "description",
        "maxSize",
        "requiredRoles",
        "requiredSkills",
        "isOpen",
    ];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.requiredRoles !== undefined)
        updates.requiredRoles = parseList(updates.requiredRoles);
    if (updates.requiredSkills !== undefined)
        updates.requiredSkills = parseList(updates.requiredSkills);

    const updated = await populateTeam(
        Team.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true })
    );

    emitToTeam(team._id, "team:updated", { teamId: team._id, team: updated });

    return res.status(200).json(new ApiResponse(200, "Team updated", updated));
});

const deleteTeam = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);
    if (!team) throw new ApiError(404, "Team not found");
    if (!isLeader(team, req.user._id)) {
        throw new ApiError(403, "Only the team leader can delete the team");
    }

    const memberIds = team.members.map((m) => m.user);
    await User.updateMany(
        { _id: { $in: memberIds } },
        { $pull: { teams: team._id } }
    );
    await team.deleteOne();

    emitToTeam(team._id, "team:deleted", { teamId: team._id });

    return res.status(200).json(new ApiResponse(200, "Team deleted", {}));
});

const leaveTeam = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);
    if (!team) throw new ApiError(404, "Team not found");

    if (isLeader(team, req.user._id)) {
        throw new ApiError(
            400,
            "Leader cannot leave the team. Transfer leadership or delete the team."
        );
    }

    const isMember = team.members.some(
        (m) => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) throw new ApiError(400, "You are not a member of this team");

    team.members = team.members.filter(
        (m) => m.user.toString() !== req.user._id.toString()
    );
    if (!team.isOpen && team.members.length < team.maxSize) team.isOpen = true;
    await team.save();

    await User.findByIdAndUpdate(req.user._id, { $pull: { teams: team._id } });

    emitToTeam(team._id, "team:member-left", {
        teamId: team._id,
        userId: req.user._id,
    });

    return res.status(200).json(new ApiResponse(200, "You left the team", {}));
});

const removeMember = asyncHandler(async (req, res) => {
    const { id, userId } = req.params;
    const team = await Team.findById(id);
    if (!team) throw new ApiError(404, "Team not found");
    if (!isLeader(team, req.user._id)) {
        throw new ApiError(403, "Only the team leader can remove members");
    }
    if (userId === team.leader.toString()) {
        throw new ApiError(400, "Leader cannot be removed");
    }

    const before = team.members.length;
    team.members = team.members.filter((m) => m.user.toString() !== userId);
    if (team.members.length === before) {
        throw new ApiError(404, "User is not a member of this team");
    }
    if (!team.isOpen && team.members.length < team.maxSize) team.isOpen = true;
    await team.save();

    await User.findByIdAndUpdate(userId, { $pull: { teams: team._id } });

    emitToTeam(team._id, "team:member-removed", { teamId: team._id, userId });

    return res.status(200).json(new ApiResponse(200, "Member removed", {}));
});

export {
    createTeam,
    getTeams,
    getMyTeams,
    getTeamById,
    updateTeam,
    deleteTeam,
    leaveTeam,
    removeMember,
};
