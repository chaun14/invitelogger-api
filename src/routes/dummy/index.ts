import express from "express";
import controller from "../../controllers/dummy";

const router = express.Router();

router.get("/dummy", controller.handleDummy);

export = router;
