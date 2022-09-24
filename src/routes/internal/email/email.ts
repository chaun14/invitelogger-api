import { handleMailRequest } from "../../../controllers/emails/sendMail";
import express from "express";

const router = express.Router();

router.post("/", handleMailRequest);

export = router;
