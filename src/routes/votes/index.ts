import { Router } from "express";
import topgg from "../../routes/votes/topgg.js";
import vcodes from "../../routes/votes/vcodes.js";
import dlist from "../../routes/votes/dlist.js";
import wumpusStore from "../../routes/votes/wumpus.js";

const router: Router = Router();

router.use("/votes/topgg", topgg);
router.use("/votes/vcodes", vcodes);
router.use("/votes/dlist", dlist);
router.use("/votes/wumpus", wumpusStore);

export default router;
