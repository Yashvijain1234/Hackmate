import { Router } from "express";
import {
    requestToJoin,
    inviteUser,
    respondToRequest,
    cancelRequest,
    getSentRequests,
    getIncomingRequests,
} from "../controllers/joinRequest.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All join-request routes require authentication.
router.use(verifyJWT);

router.route("/request").post(requestToJoin);
router.route("/invite").post(inviteUser);
router.route("/sent").get(getSentRequests);
router.route("/incoming").get(getIncomingRequests);
router.route("/:id/respond").patch(respondToRequest);
router.route("/:id/cancel").patch(cancelRequest);

export default router;
