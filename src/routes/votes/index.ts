import express from "express";
import topgg from "../../routes/votes/topgg";
import vcodes from "../../routes/votes/vcodes";
import dlist from "../../routes/votes/dlist";
import wumpusStore from "../../routes/votes/wumpus";

const router = express.Router();

router.use("/votes/topgg", topgg);
router.use("/votes/vcodes", vcodes);
router.use("/votes/dlist", dlist);
router.use("/votes/wumpus", wumpusStore);

export = router;
