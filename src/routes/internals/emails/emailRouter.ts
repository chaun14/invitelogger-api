import { Router } from "express";

import { handleEmail } from "@controllers/internals/emails/emailsController.js";

const emailRouter = Router();

emailRouter.post("/mail", handleEmail);

export default emailRouter;
