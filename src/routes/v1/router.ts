import { Router } from "express";

import invitesRouter from "@routes/v1/invites/invitesRouter.js";
import authRouter from "@routes/v1/auth/authRouter.js";

const router = Router();

router.use("/invites", invitesRouter);
router.use("/auth", authRouter);

export default router;
