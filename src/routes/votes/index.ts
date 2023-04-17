import express from "express";
import topgg from "../../routes/votes/topgg";
import vcodes from "../../routes/votes/vcodes";
import dlist from "../../routes/votes/dlist";
const router = express.Router();

router.use("/votes/topgg", topgg);
router.use("/votes/vcodes", vcodes);
router.use("/votes/dlist", dlist);

export = router;
