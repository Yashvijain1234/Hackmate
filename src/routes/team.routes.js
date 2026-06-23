import { Router } from "express";
import {
    createTeam,
    getTeams,
    getMyTeams,
    getTeamById,
    updateTeam,
    deleteTeam,
    leaveTeam,
    removeMember,
} from "../controllers/team.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(getTeams).post(verifyJWT, createTeam);
router.route("/mine").get(verifyJWT, getMyTeams);

router
    .route("/:id")
    .get(getTeamById)
    .patch(verifyJWT, updateTeam)
    .delete(verifyJWT, deleteTeam);

router.route("/:id/leave").post(verifyJWT, leaveTeam);
router.route("/:id/members/:userId").delete(verifyJWT, removeMember);

export default router;
