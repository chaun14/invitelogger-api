import { Router } from "express";
import dcTokenAuth from "./auth.js";
import { handleFakeVerification } from "../../../controllers/integrations/doubleCounter.js";

const router: Router = Router();

router.use(dcTokenAuth);

router.post("/verification", handleFakeVerification);

export default router;
