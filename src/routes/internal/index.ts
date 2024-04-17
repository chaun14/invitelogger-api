import internalTokenAuthentication from "../../middlewares/internalAuth.js";
import mail from "./email/email.js";
import { Router } from "express";
const router: Router = Router();

router.use(internalTokenAuthentication);
router.use("/mail", mail);

export default router;
