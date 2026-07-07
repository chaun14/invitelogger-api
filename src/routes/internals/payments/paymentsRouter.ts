import { Router } from "express";

import { handlePayments } from "@controllers/internals/payments/paymentsController.js";

const router = Router();

router.post("/", handlePayments);

export default router;
