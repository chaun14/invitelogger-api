import { Router } from "express";

import { handleAuthCheck } from "@controllers/v1/auth/authController.js";

const authRouter = Router();

authRouter.get("/check", handleAuthCheck);

export default authRouter;
