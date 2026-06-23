import { Router } from "express";
import {
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
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/search").get(searchUsers);

// Protected routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, changePassword);
router.route("/profile").patch(verifyJWT, updateProfile);
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

// Keep param route last so it doesn't shadow the static ones above.
router.route("/:id").get(getUserById);

export default router;
