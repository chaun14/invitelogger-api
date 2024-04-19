import { Router } from "express";

import emailRouter from "@routes/internals/emails/emailRouter.js";
import integrationsRouter from "@routes/internals/integrations/integrationsRouter.js";
import paymentsRouter from "@routes/internals/payments/paymentsRouter.js";
import votesRouter from "@routes/internals/votes/voteRouter.js";

const router = Router();

// TODO-01: Switch to a global "internal" prefix
router.use("/payments", paymentsRouter);
router.use("/votes", votesRouter);
router.use("/integrations", integrationsRouter);
router.use("/internal", emailRouter);

export default router;
