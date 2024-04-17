import { handleMailRequest } from "../../../controllers/emails/sendMail.js";
import { Router } from "express";

const router: Router = Router();

router.post("/", handleMailRequest);

export default router;
