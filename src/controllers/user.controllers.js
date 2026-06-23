import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
};

const generateAccessAndRefreshTokens = async (userId) => {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
    const {
        userName,
        email,
        password,
        bio,
        skills,
        preferredRoles,
        experienceLevel,
        githubUrl,
        linkedinUrl,
        portfolioUrl,
        collegeOrOrg,
    } = req.body;

    if ([userName, email, password].some((f) => !f || f.trim() === "")) {
        throw new ApiError(400, "userName, email and password are required");
    }

    const existing = await User.findOne({
        $or: [{ userName: userName.toLowerCase() }, { email: email.toLowerCase() }],
    });
    if (existing) {
        throw new ApiError(409, "User with this email or username already exists");
    }

    let avatarUrl;
    const avatarLocalPath = req.file?.path;
    if (avatarLocalPath) {
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (avatar?.url) avatarUrl = avatar.url;
    }

    const parseList = (value) =>
        Array.isArray(value)
            ? value
            : typeof value === "string" && value.length
              ? value.split(",").map((s) => s.trim()).filter(Boolean)
              : undefined;

    const user = await User.create({
        userName,
        email,
        password,
        ...(avatarUrl && { avatar: avatarUrl }),
        bio,
        skills: parseList(skills),
        preferredRoles: parseList(preferredRoles),
        experienceLevel,
        githubUrl,
        linkedinUrl,
        portfolioUrl,
        collegeOrOrg,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(201)
        .json(new ApiResponse(201, "User registered successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, userName, password } = req.body;

    if (!password || (!email && !userName)) {
        throw new ApiError(400, "Email/username and password are required");
    }

    const user = await User.findOne({
        $or: [
            ...(email ? [{ email: email.toLowerCase() }] : []),
            ...(userName ? [{ userName: userName.toLowerCase() }] : []),
        ],
    });
    if (!user) throw new ApiError(404, "User does not exist");

    const valid = await user.isPasswordCorrect(password);
    if (!valid) throw new ApiError(401, "Invalid credentials");

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, "Logged in successfully", {
                user: loggedInUser,
                accessToken,
                refreshToken,
            })
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, "Logged out successfully", {}));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!incomingToken) throw new ApiError(401, "Unauthorized request");

    let decoded;
    try {
        decoded = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decoded?._id);
    if (!user || user.refreshToken !== incomingToken) {
        throw new ApiError(401, "Refresh token is invalid or has been used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, "Access token refreshed", {
                accessToken,
                refreshToken,
            })
        );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .select("-password -refreshToken")
        .populate("teams", "name hackathon");

    return res
        .status(200)
        .json(new ApiResponse(200, "Current user fetched", user));
});

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old and new password are required");
    }

    const user = await User.findById(req.user._id);
    const valid = await user.isPasswordCorrect(oldPassword);
    if (!valid) throw new ApiError(401, "Old password is incorrect");

    user.password = newPassword;
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, "Password changed successfully", {}));
});

const updateProfile = asyncHandler(async (req, res) => {
    const allowed = [
        "bio",
        "skills",
        "preferredRoles",
        "experienceLevel",
        "githubUrl",
        "linkedinUrl",
        "portfolioUrl",
        "collegeOrOrg",
    ];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (typeof updates.skills === "string") {
        updates.skills = updates.skills.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (typeof updates.preferredRoles === "string") {
        updates.preferredRoles = updates.preferredRoles
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, "Profile updated", user));
});

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required");

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar?.url) throw new ApiError(500, "Failed to upload avatar");

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, "Avatar updated", user));
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
        .select("-password -refreshToken -email")
        .populate("teams", "name hackathon");
    if (!user) throw new ApiError(404, "User not found");

    return res
        .status(200)
        .json(new ApiResponse(200, "User profile fetched", user));
});

// Discover teammates by skill / role / experience.
const searchUsers = asyncHandler(async (req, res) => {
    const { skill, role, experience, q, page = 1, limit = 12 } = req.query;
    const filter = {};
    if (skill) filter.skills = { $in: skill.split(",").map((s) => s.trim()) };
    if (role) filter.preferredRoles = { $in: role.split(",").map((s) => s.trim()) };
    if (experience) filter.experienceLevel = experience;
    if (q) {
        filter.$or = [
            { userName: { $regex: q, $options: "i" } },
            { bio: { $regex: q, $options: "i" } },
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
        User.find(filter)
            .select("-password -refreshToken -email")
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 }),
        User.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Users fetched", {
            users,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        })
    );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changePassword,
    updateProfile,
    updateAvatar,
    getUserById,
    searchUsers,
};
