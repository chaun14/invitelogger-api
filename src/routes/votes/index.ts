import express from "express";
import topgg from "../../routes/votes/topgg";
import vcodes from "../../routes/votes/vcodes";
const router = express.Router();

router.use("/votes/topgg", topgg);
router.use("/votes/vcodes", vcodes);

export = router;
