import { Router, Request, Response } from "express";

import { v1Auth } from "@middlewares/authenticate.js";

import invitesRouter from "@routes/v1/invites/invitesRouter.js";
import authRouter from "@routes/v1/auth/authRouter.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.send({
    message:
      "Welcome to inviteLogger api. Find our documentation here: https://developers.invitelogger.me",
  });
});

router.use("/invites", v1Auth, invitesRouter);
router.use("/auth", v1Auth, authRouter);

export default router;
