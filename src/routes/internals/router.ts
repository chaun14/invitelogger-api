import { Router } from "express";

import authenticate, { AuthenticateType } from "@middlewares/authenticate.js";

import emailRouter from "@routes/internals/emails/emailRouter.js";
import integrationsRouter from "@routes/internals/integrations/integrationsRouter.js";
import paymentsRouter from "@routes/internals/payments/paymentsRouter.js";
import votesRouter from "@routes/internals/votes/voteRouter.js";

const router = Router();

router.use("/payments", authenticate(AuthenticateType.PAYMENT), paymentsRouter);
router.use("/votes", authenticate(AuthenticateType.VOTE), votesRouter);
router.use("/integrations", authenticate(AuthenticateType.INTEGRATION), integrationsRouter);
router.use("/internal", authenticate(AuthenticateType.EMAIL), emailRouter);

export default router;
