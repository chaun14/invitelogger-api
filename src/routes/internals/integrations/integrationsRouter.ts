import { Router } from "express";

import { handleVerificationGg } from "@controllers/internals/integrations/integrationsController.js";

const integrationsRouter = Router();

integrationsRouter.post("/verifgg/verification", handleVerificationGg);

export default integrationsRouter;
