import tokenAuth from "../../middlewares/tokenAuth";
import express from "express";
import controller from "../../controllers/invites/user";

const router = express.Router();

router.use(tokenAuth);
router.get("/user", controller.handleInvitesUser);

export = router;
