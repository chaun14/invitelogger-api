import { Router } from "express";

import { handleDoubleCounter } from "@controllers/internals/integrations/integrationsController.js";

const integrationsRouter = Router();

integrationsRouter.post("/dc/verification", handleDoubleCounter);

export default integrationsRouter;
