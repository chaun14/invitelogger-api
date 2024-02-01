import express from "express";
import controller from "../../controllers/votes";
const router = express.Router();

router.post("/", controller.handleWumpustoreVote);

export = router;
