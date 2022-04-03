import express from "express";
import userController from "../../controllers/invites/user";
import invitesController from "../../controllers/invites/code";

const router = express.Router();

router.get("/user", userController.handleInvitesUser);
router.get("/code", invitesController.handleInvitesCode);

export = router;
