import { Router } from "express";

import { integrationAuth, internalAuth, voteAuth } from "@middlewares/authenticate.js";

import emailRouter from "@routes/internals/emails/emailRouter.js";
import integrationsRouter from "@routes/internals/integrations/integrationsRouter.js";
import paymentsRouter from "@routes/internals/payments/paymentsRouter.js";
import votesRouter from "@routes/internals/votes/voteRouter.js";

const router = Router();

// TODO-01: Switch to a global "internal" prefix
router.use("/payments", paymentsRouter);
router.use("/votes", voteAuth, votesRouter);
router.use("/integrations", integrationAuth, integrationsRouter);
router.use("/internal", internalAuth, emailRouter);

export default router;
