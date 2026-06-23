import { Router } from "express";
import {
    createHackathon,
    getHackathons,
    getHackathonById,
    updateHackathon,
    deleteHackathon,
    ingestHackathons,
} from "../controllers/hackathon.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/ingest").post(verifyJWT, ingestHackathons);
router.route("/").get(getHackathons).post(verifyJWT, createHackathon);
router
    .route("/:id")
    .get(getHackathonById)
    .patch(verifyJWT, updateHackathon)
    .delete(verifyJWT, deleteHackathon);

export default router;
