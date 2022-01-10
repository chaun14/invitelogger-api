import tokenAuth from "../../middlewares/tokenAuth";
import express from "express";
import controller from "../../controllers/dummy";

const router = express.Router();

router.use(tokenAuth);
router.get("/dummy", controller.handleDummy);

export = router;
