import express from "express";
import controller from "../../controllers/tebex";
const router = express.Router();

router.post("/payments", controller.handleTebexWebhook);

export = router;
