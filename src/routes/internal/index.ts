import internalTokenAuthentication from "../../middlewares/internalAuth";
import express from "express";

const router = express.Router();

router.use(internalTokenAuthentication);
router.use("/mail", require("./email/email"));

export = router;
