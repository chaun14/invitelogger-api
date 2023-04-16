import express from "express";
import dcTokenAuth from "./auth";
import { handleFakeVerification } from "../../../controllers/integrations/doubleCounter";

const router = express.Router();

router.use(dcTokenAuth);

router.post("/verification", handleFakeVerification);

export = router;
