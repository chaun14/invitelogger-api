import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getConnection } from "typeorm";
import { Payments } from "../entities/dash/payments";

enum TebexWebhookType {
  // Sub stuff
  SubscriptionRenew = "recurring-payment.renewed",
  SubscriptionCreate = "recurring-payment.started",
  SubscriptionEnd = "recurring-payment.ended",

  // payment stuff
  PaymentCreated = "payment.completed",

  // random stuff
  EndpointValidation = "validation.webhook",
}

// adding a post
const handleTebexWebhook = async (req: Request, res: Response, next: NextFunction) => {
  // get the data from req.body
  let body: any = req.body;

  console.log(body);

  if (!body || !body.id || !req.rawBody)
    return res.status(400).json({
      message: "Bad request",
    });

  if (process.env.ENVIRONNEMENT !== "dev") {
    // authenticate the incoming request
    const hmac = crypto.createHmac("sha256", process.env.TEBEX_KEY as string).setEncoding("utf-8");
    const retrievedSignature = req.get("X-Signature");
    let hash = crypto.createHash("sha256").update(req.rawBody).digest("hex");
    hmac.update(hash);
    const bodySignature = hmac.digest("hex");
    if (retrievedSignature !== bodySignature)
      return res.status(403).json({
        message: "Invalid signature",
      });
  } else {
    console.log("PAYMENT SECURITY CHECK BYPASS !!!!");
  }

  // return response
  res.status(200).json({
    id: body.id,
  });

  paymentManager(req.body);
};

async function paymentManager(payment: {
  id: string;
  type: TebexWebhookType;
  date: string;
  subject: {
    transaction_id?: string;
    status: { id: number; description: string };
    recurring_payment_reference: string | null;
    products: Array<{ id: number; quantity: number }>;
    price: {
      amount: number;
      currency: string;
    };
    customer: { first_name: string; last_name: string; email: string; ip: string; username: { id: string; username: string } };
    created_at: Date;
  };
}) {
  switch (payment.type) {
    case TebexWebhookType.SubscriptionCreate:
      break;

    case TebexWebhookType.SubscriptionEnd:
      //TODO leaving us mail survey
      break;

    case TebexWebhookType.SubscriptionRenew:
      break;

    case TebexWebhookType.PaymentCreated:
      console.log("payment recieved");
      // time to register the payment in our logs
      let sqlDatetime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0, 19).replace("T", " ");

      await getConnection("dash").manager.insert(Payments, {
        payment_id: payment.subject.transaction_id,
        amount: payment.subject.price.amount,
        date: payment.subject.created_at,
        status: payment.subject.status.description,
        currency: payment.subject.price.currency,
        mail: payment.subject.customer.email,
        username: payment.subject.customer.username.username,
        discord_id: payment.subject.customer.username.id,
        packages: payment.subject.products.map((pkg) => pkg.id.toString()),
        subscriptionReference: payment.subject.recurring_payment_reference,
        createdAt: sqlDatetime,
        updatedAt: sqlDatetime,
      });

      if (!payment.subject.recurring_payment_reference) return; // we will handle this payment on the SubscriptionCreate / SubscriptionRenew webhook

      break;
  }
}

export default { handleTebexWebhook };
