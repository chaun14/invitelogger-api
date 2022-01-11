import express from "express";
import controller from "../../controllers/invites/user";

const router = express.Router();

router.get("/user", controller.handleInvitesUser);

export = router;
