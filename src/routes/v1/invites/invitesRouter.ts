import { Router } from "express";

import { handleCode, handleUser } from "@controllers/v1/invites/invitesController.js";

const invitesRouter = Router();

invitesRouter.get("/user", handleUser);
invitesRouter.get("/code", handleCode);

export default invitesRouter;
