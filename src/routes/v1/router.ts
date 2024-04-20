import { Request, Response, Router } from "express";

import authenticate, { AuthenticateType } from "@middlewares/authenticate.js";

import invitesRouter from "@routes/v1/invites/invitesRouter.js";
import authRouter from "@routes/v1/auth/authRouter.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.send({
    message: "Welcome to inviteLogger api. Find our documentation here: https://developers.invitelogger.me",
  });
});

router.use("/invites", authenticate(AuthenticateType.PUBLIC), invitesRouter);
router.use("/auth", authenticate(AuthenticateType.PUBLIC), authRouter);

export default router;
