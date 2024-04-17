import { Router } from "express";
import controller from "../../controllers/dummy.js";
const router: Router = Router();

router.get("/checkauth", controller.checkAuth);

export default router;
