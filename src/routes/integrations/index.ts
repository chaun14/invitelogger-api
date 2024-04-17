import { Router } from "express";
import dc from "./dc/index.js";

const router: Router = Router();

router.use("/dc", dc);

export default router;
