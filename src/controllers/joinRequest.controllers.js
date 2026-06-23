import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { JoinRequest } from "../models/joinRequest.model.js";
import { Team } from "../models/team.model.js";
import { User } from "../models/user.model.js";
import { emitToUser } from "../socket/index.js";
import { sendEmail } from "../utils/email.js";

const notify = (userId, event, payload) => emitToUser(userId, event, payload);

const populateRequest = (query) =>
    query
        .populate("user", "userName avatar skills preferredRoles")
        .populate({
            path: "team",
            select: "name leader hackathon maxSize members isOpen",
            populate: { path: "hackathon", select: "name" },
        });

// A user asks to join an open team.
const requestToJoin = asyncHandler(async (req, res) => {
    const { teamId, message } = req.body;
    if (!teamId) throw new ApiError(400, "teamId is required");

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");

    if (team.leader.toString() === req.user._id.toString()) {
        throw new ApiError(400, "You are the leader of this team");
    }
    if (team.members.some((m) => m.user.toString() === req.user._id.toString())) {
        throw new ApiError(400, "You are already a member of this team");
    }
    if (!team.isOpen || team.members.length >= team.maxSize) {
        throw new ApiError(400, "This team is not accepting new members");
    }

    const existing = await JoinRequest.findOne({ team: teamId, user: req.user._id });
    if (existing && existing.status === "pending") {
        throw new ApiError(409, "You already have a pending request for this team");
    }

    let request;
    if (existing) {
        existing.status = "pending";
        existing.initiatedBy = "user";
        existing.message = message;
        existing.respondedAt = undefined;
        request = await existing.save();
    } else {
        request = await JoinRequest.create({
            team: teamId,
            user: req.user._id,
            initiatedBy: "user",
            message,
        });
    }

    const populated = await populateRequest(JoinRequest.findById(request._id));

    notify(team.leader, "joinRequest:received", {
        request: populated,
        message: `${req.user.userName} requested to join "${team.name}"`,
    });

    const leader = await User.findById(team.leader).select("email userName");
    if (leader?.email) {
        sendEmail({
            to: leader.email,
            subject: `New join request for ${team.name}`,
            text: `${req.user.userName} wants to join your team "${team.name}". Log in to HackMate to accept or reject.`,
        });
    }

    return res
        .status(201)
        .json(new ApiResponse(201, "Join request sent", populated));
});

// A team leader invites a user to their team.
const inviteUser = asyncHandler(async (req, res) => {
    const { teamId, userId, message } = req.body;
    if (!teamId || !userId) {
        throw new ApiError(400, "teamId and userId are required");
    }

    const team = await Team.findById(teamId);
    if (!team) throw new ApiError(404, "Team not found");
    if (team.leader.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only the team leader can invite members");
    }
    if (team.members.length >= team.maxSize) {
        throw new ApiError(400, "Team is already full");
    }

    const invitee = await User.findById(userId).select("email userName");
    if (!invitee) throw new ApiError(404, "User to invite not found");
    if (team.members.some((m) => m.user.toString() === userId)) {
        throw new ApiError(400, "User is already a member");
    }

    const existing = await JoinRequest.findOne({ team: teamId, user: userId });
    if (existing && existing.status === "pending") {
        throw new ApiError(409, "There is already a pending request for this user");
    }

    let request;
    if (existing) {
        existing.status = "pending";
        existing.initiatedBy = "team";
        existing.message = message;
        existing.respondedAt = undefined;
        request = await existing.save();
    } else {
        request = await JoinRequest.create({
            team: teamId,
            user: userId,
            initiatedBy: "team",
            message,
        });
    }

    const populated = await populateRequest(JoinRequest.findById(request._id));

    notify(userId, "joinRequest:invited", {
        request: populated,
        message: `You were invited to join "${team.name}"`,
    });

    if (invitee.email) {
        sendEmail({
            to: invitee.email,
            subject: `You're invited to join ${team.name}`,
            text: `${req.user.userName} invited you to join their team "${team.name}" on HackMate.`,
        });
    }

    return res
        .status(201)
        .json(new ApiResponse(201, "Invitation sent", populated));
});

const addMemberToTeam = async (team, userId, role = "Member") => {
    team.members.push({ user: userId, role });
    if (team.members.length >= team.maxSize) team.isOpen = false;
    await team.save();
    await User.findByIdAndUpdate(userId, { $addToSet: { teams: team._id } });
};

// Accept or reject a pending request/invite.
const respondToRequest = asyncHandler(async (req, res) => {
    const { action } = req.body; // 'accept' | 'reject'
    if (!["accept", "reject"].includes(action)) {
        throw new ApiError(400, "action must be 'accept' or 'reject'");
    }

    const request = await JoinRequest.findById(req.params.id);
    if (!request) throw new ApiError(404, "Request not found");
    if (request.status !== "pending") {
        throw new ApiError(400, `Request is already ${request.status}`);
    }

    const team = await Team.findById(request.team);
    if (!team) throw new ApiError(404, "Team no longer exists");

    const isLeader = team.leader.toString() === req.user._id.toString();
    const isInvitee = request.user.toString() === req.user._id.toString();

    // Only the correct party may respond.
    if (request.initiatedBy === "user" && !isLeader) {
        throw new ApiError(403, "Only the team leader can respond to this request");
    }
    if (request.initiatedBy === "team" && !isInvitee) {
        throw new ApiError(403, "Only the invited user can respond to this invite");
    }

    request.status = action === "accept" ? "accepted" : "rejected";
    request.respondedAt = new Date();

    if (action === "accept") {
        if (team.members.some((m) => m.user.toString() === request.user.toString())) {
            throw new ApiError(400, "User is already a member");
        }
        if (team.members.length >= team.maxSize) {
            throw new ApiError(400, "Team is already full");
        }
        await addMemberToTeam(team, request.user);
    }
    await request.save();

    const populated = await populateRequest(JoinRequest.findById(request._id));

    // Notify the party who did NOT respond.
    const recipientId =
        request.initiatedBy === "user" ? request.user : team.leader;
    notify(recipientId, "joinRequest:responded", {
        request: populated,
        message: `Your ${request.initiatedBy === "user" ? "request" : "invite"} for "${team.name}" was ${request.status}`,
    });

    const recipient = await User.findById(recipientId).select("email");
    if (recipient?.email) {
        sendEmail({
            to: recipient.email,
            subject: `Update on your HackMate request for ${team.name}`,
            text: `Your ${request.initiatedBy === "user" ? "join request" : "invitation"} for "${team.name}" was ${request.status}.`,
        });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, `Request ${request.status}`, populated));
});

// The initiator cancels their own pending request/invite.
const cancelRequest = asyncHandler(async (req, res) => {
    const request = await JoinRequest.findById(req.params.id);
    if (!request) throw new ApiError(404, "Request not found");
    if (request.status !== "pending") {
        throw new ApiError(400, `Request is already ${request.status}`);
    }

    const team = await Team.findById(request.team);
    const isInitiator =
        request.initiatedBy === "user"
            ? request.user.toString() === req.user._id.toString()
            : team && team.leader.toString() === req.user._id.toString();

    if (!isInitiator) {
        throw new ApiError(403, "You can only cancel your own request");
    }

    request.status = "cancelled";
    request.respondedAt = new Date();
    await request.save();

    return res
        .status(200)
        .json(new ApiResponse(200, "Request cancelled", request));
});

// Requests/invites the current user initiated.
const getSentRequests = asyncHandler(async (req, res) => {
    const myTeams = await Team.find({ leader: req.user._id }).select("_id");
    const teamIds = myTeams.map((t) => t._id);

    const requests = await populateRequest(
        JoinRequest.find({
            $or: [
                { user: req.user._id, initiatedBy: "user" },
                { team: { $in: teamIds }, initiatedBy: "team" },
            ],
        }).sort({ createdAt: -1 })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, "Sent requests fetched", requests));
});

// Requests/invites awaiting the current user's response.
const getIncomingRequests = asyncHandler(async (req, res) => {
    const myTeams = await Team.find({ leader: req.user._id }).select("_id");
    const teamIds = myTeams.map((t) => t._id);

    const requests = await populateRequest(
        JoinRequest.find({
            $or: [
                { team: { $in: teamIds }, initiatedBy: "user" },
                { user: req.user._id, initiatedBy: "team" },
            ],
        }).sort({ createdAt: -1 })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, "Incoming requests fetched", requests));
});

export {
    requestToJoin,
    inviteUser,
    respondToRequest,
    cancelRequest,
    getSentRequests,
    getIncomingRequests,
};
