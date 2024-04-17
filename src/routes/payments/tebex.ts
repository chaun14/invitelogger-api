import { Router } from "express";
import controller from "../../controllers/tebex.js";
const router: Router = Router();

router.post("/payments", controller.handleTebexWebhook);

export default router;
