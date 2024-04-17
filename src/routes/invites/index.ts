import { Router } from "express";
import userController from "../../controllers/invites/user.js";
import invitesController from "../../controllers/invites/code.js";

const router: Router = Router();

router.get("/user", userController.handleInvitesUser);
router.get("/code", invitesController.handleInvitesCode);

export default router;
