import { Router } from "express";

import authenticate, { AuthenticateType } from "@middlewares/authenticate.js";

import emailRouter from "@routes/internals/emails/emailRouter.js";
import integrationsRouter from "@routes/internals/integrations/integrationsRouter.js";
import paymentsRouter from "@routes/internals/payments/paymentsRouter.js";
import votesRouter from "@routes/internals/votes/voteRouter.js";

const router = Router();

router.use("/payments", authenticate(AuthenticateType.Payment), paymentsRouter);
router.use("/votes", authenticate(AuthenticateType.Vote), votesRouter);
router.use("/integrations", authenticate(AuthenticateType.Integration), integrationsRouter);
router.use("/internal", authenticate(AuthenticateType.Email), emailRouter);

export default router;
