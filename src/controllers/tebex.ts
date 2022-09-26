import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getConnection } from "typeorm";
import { Payments } from "../entities/dash/Payments";
import { PremiumPlanCategory, PremiumPlanPeriod, PremiumPlans } from "../entities/dash/PremiumPlans";
import { PremiumServices, PremiumServiceStatus, PremiumServiceType } from "../entities/dash/PremiumServices";
import dayjs from "dayjs";
import { sendMail } from "./emails/sendMail";

enum TebexWebhookType {
  // Sub stuff
  SubscriptionRenew = "recurring-payment.renewed",
  SubscriptionCreate = "recurring-payment.started",
  SubscriptionEnd = "recurring-payment.ended",

  // payment stuff
  PaymentCreated = "payment.completed",
  PaymentRefunded = "payment.refunded",

  // random stuff
  EndpointValidation = "validation.webhook",
}

interface Payment {
  transaction_id?: string;
  customer: { first_name: string; last_name: string; email: string; ip: string; username: { id: string; username: string } };
  recurring_payment_reference: string | null;
  payment_sequence: string | "oneoff";
  products: Array<{ id: number; quantity: number; name: string }>;
  price: {
    amount: number;
    currency: string;
  };
  created_at: string;
  status: { id: number; description: string };
}

interface PaymentWebhook {
  id: string;
  type: TebexWebhookType;
  date: string;
  subject: Payment;
}

interface RecurringPaymentWebhook {
  id: string;
  type: TebexWebhookType;
  date: string;
  subject: {
    reference: string;
    created_at: string;
    next_payment_at: string;
    status: { id: number; description: string };
    initial_payment: Payment;
    last_payment: Payment;
    price: {
      amount: number;
      currency: string;
    };
    fail_count: number;
    cancelled_at: string | null;
    cancel_reason: string | null;
  };
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

async function paymentManager(payment: PaymentWebhook | RecurringPaymentWebhook) {
  switch (payment.type) {
    case TebexWebhookType.SubscriptionCreate:
      payment = payment as RecurringPaymentWebhook;
      recieveSubscriptionPayment(payment);

      break;

    case TebexWebhookType.SubscriptionEnd:
      payment = payment as RecurringPaymentWebhook;

      await getConnection("dash").manager.update(PremiumServices, { subscriptionReference: payment.subject.reference }, { subEndedAt: dayjs().format("YYYY-MM-DD  HH:mm:ss.000") });
      sendMail(
        payment.subject.initial_payment.customer.email,
        "Your InviteLogger subscription has ended",
        `Hello, your subscription ${payment.subject.reference} has been terminated for ${payment.subject.cancel_reason || "not specified"}. Any problem with your service ? Feel free to contact us 👋`,
        { title: "Your service will expire", button_txt: "Contact us", button_url: "https://discord.gg/invitelogger" }
      );

      break;

    case TebexWebhookType.SubscriptionRenew:
      payment = payment as RecurringPaymentWebhook;

      recieveSubscriptionPayment(payment);

      break;

    case TebexWebhookType.PaymentCreated:
      payment = payment as PaymentWebhook;
      console.log("payment recieved");
      // time to register the payment in our logs
      let sqlDatetime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0, 19).replace("T", " ");

      let existingPayment = await getConnection("dash").manager.findOne(Payments, { where: { payment_id: payment.subject.transaction_id } });

      if (existingPayment) return console.log("DUPLICATE PAYMENT ENTRY RECIEVED !!");

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

      if (payment.subject.recurring_payment_reference) return; // we will handle this payment on the SubscriptionCreate / SubscriptionRenew webhook

      // time to check if it is needed to extend a current
      for (let tebexPlan of payment.subject.products) {
        for (let i = 0; i < tebexPlan.quantity; i++) {
          // we have the get the plan id from the plan tebex id
          let currentPlan = await getConnection("dash").manager.findOne(PremiumPlans, { where: { tebexPackageId: tebexPlan.id } });
          if (!currentPlan) {
            console.log("UNKNOWN PLAN PAYMENT RECIEVED");
          } else {
            // now we have plan data, time to do some sketchy shit
            // first we have to check if we can bump an existing service
            let matchingService = await getConnection("dash").manager.findOne(PremiumServices, { where: { user_id: payment.subject.customer.username.id, plan_id: currentPlan.id, subscriptionReference: null, type: "subscription" } });

            if (matchingService) {
              // add a month to it
              if (currentPlan.period == PremiumPlanPeriod.MONTHLY) {
                matchingService.nextDue = dayjs(matchingService.nextDue).add(1, "month").format("YYYY-MM-DD");
                matchingService.status = PremiumServiceStatus.ACTIVE; // enable it it in case of suspend
              } else if (currentPlan.period == PremiumPlanPeriod.YEARLY) {
                matchingService.status = PremiumServiceStatus.ACTIVE; // enable it it in case of suspend
                matchingService.nextDue = dayjs(matchingService.nextDue).add(1, "year").format("YYYY-MM-DD");
              }
              await getConnection("dash").manager.save(matchingService);
            } else {
              // create a new service
              let nextDue;
              if (currentPlan.period == PremiumPlanPeriod.MONTHLY) {
                nextDue = dayjs().add(1, "month").format("YYYY-MM-DD");
              } else if (currentPlan.period == PremiumPlanPeriod.YEARLY) {
                nextDue = dayjs().add(1, "year").format("YYYY-MM-DD");
              }
              await getConnection("dash").manager.insert(PremiumServices, {
                user_id: payment.subject.customer.username.id,
                status: PremiumServiceStatus.ACTIVE,
                createdAt: sqlDatetime,
                updatedAt: sqlDatetime,
                plan_id: currentPlan.id,
                subscriptionReference: null,
                renewedAt: sqlDatetime,
                suspendedAt: null,
                nextDue: nextDue,
                type: PremiumServiceType.SUB,
              });

              // send a mail to the user
              // if the plan is a gold plan
              if (currentPlan.category == PremiumPlanCategory.GOLD) {
                sendMail(
                  payment.subject.customer.email,
                  "Your purchase on InviteLogger has been processed",
                  `Hello, your ${currentPlan.name} has been activated succesfully. To activate InviteLogger gold on your server, please login on the Gold dashboard, select your service and insert your server id`,
                  {
                    title: "Thanks for your purchase",
                  }
                );
              } else if (currentPlan.category == PremiumPlanCategory.PBI) {
                sendMail(payment.subject.customer.email, "Your purchase on InviteLogger has been processed", `Hello, your ${currentPlan.name} has been activated succesfully. To activate your private bot instance, join our support server and run the tutorial below.`, {
                  title: "Thanks for your purchase",
                  button_txt: "Private bot setup tutorial",
                  button_url: "https://docs.invitelogger.me/pbi/get-pbi/setup-your-private-bot-instance",
                });
              }
            }
          }
        }
      }

      break;

    case TebexWebhookType.PaymentRefunded:
      payment = payment as PaymentWebhook;
      console.log("payment refunded " + payment.subject.transaction_id);
      // time to register the payment in our logs
      await getConnection("dash").manager.update(Payments, { payment_id: payment.subject.transaction_id }, { status: payment.subject.status.description, refundedAt: dayjs().format("YYYY-MM-DD  HH:mm:ss.000") });

      // send an email to the customer
      sendMail(
        payment.subject.customer.email,
        "Your payment has been refunded",
        `Hello, your payment ${payment.subject.transaction_id} for ${payment.subject.products[0].name} (${payment.subject.price.amount} ${payment.subject.price.currency}) has been refunded, the process may take up to a few days to complete. ⚠️ Your service might be suspended depending on the context, reach to us for more informations`,
        { button_txt: "Contact us", button_url: "https://discord.gg/invitelogger", title: "You've been refunded" }
      );
  }
}

async function recieveSubscriptionPayment(payment: RecurringPaymentWebhook) {
  let sqlDatetime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0, 19).replace("T", " ");

  // time to check if it is needed to extend a current
  for (let tebexPlan of payment.subject.last_payment.products) {
    for (let i = 0; i < tebexPlan.quantity; i++) {
      // we have the get the plan id from the plan tebex id
      let currentPlan = await getConnection("dash").manager.findOne(PremiumPlans, { where: { tebexPackageId: tebexPlan.id } });
      if (!currentPlan) {
        console.log("UNKNOWN PLAN PAYMENT RECIEVED");
      } else {
        // now we have plan data, time to do some sketchy shit
        // first we have to check if we can bump an existing service
        let matchingService = await getConnection("dash").manager.findOne(PremiumServices, { where: { user_id: payment.subject.last_payment.customer.username.id, plan_id: currentPlan.id, subscriptionReference: payment.subject.reference, type: "subscription" } });

        if (matchingService) {
          // just match tebex data
          matchingService.nextDue = dayjs(payment.subject.next_payment_at).format("YYYY-MM-DD");
          matchingService.status = PremiumServiceStatus.ACTIVE; // enable it it in case of suspend
          matchingService.updatedAt = sqlDatetime;
          await getConnection("dash").manager.save(matchingService);
        } else {
          // create a new service
          let nextDue = dayjs(payment.subject.next_payment_at).format("YYYY-MM-DD");

          await getConnection("dash").manager.insert(PremiumServices, {
            user_id: payment.subject.last_payment.customer.username.id,
            status: PremiumServiceStatus.ACTIVE,
            createdAt: sqlDatetime,
            updatedAt: sqlDatetime,
            plan_id: currentPlan.id,
            subscriptionReference: payment.subject.reference,
            renewedAt: sqlDatetime,
            suspendedAt: null,
            nextDue: nextDue,
            type: PremiumServiceType.SUB,
          });
        }
      }
    }
  }
}

export default { handleTebexWebhook };
