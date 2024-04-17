import { Router } from "express";
import controller from "../../controllers/votes.js";
const router: Router = Router();

router.post("/", controller.handleWumpustoreVote);

export default router;
