import express from "express";
import topgg from "../../routes/votes/topgg";
const router = express.Router();

router.use("/votes", topgg);

export = router;
