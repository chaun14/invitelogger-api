import express from "express";

const router = express.Router();

router.use("/dc", require("./dc"));

export = router;
