import { Request, Response } from "express";
import dayjs from "dayjs";

import { dashDataSource } from "@config/orm";

import { PremiumServices } from "@entity/dash/PremiumServices.js";
import { sendEmail } from "@utils/email.js";

enum PaymentType {
  SUBSCRIPTION_RENEW = "recurring-payment.renewed",
  SUBSCRIPTION_CREATE = "recurring-payment.started",
  SUBSCRIPTION_END = "recurring-payment.ended",
  PAYMENT_CREATED = "payment.completed",
  PAYMENT_REFUNDED = "payment.refunded",
  ENDPOINT_VALIDATION = "validation.webhook",
}

type Payment = {
  transaction_id: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    ip: string;
    username: { id: string; username: string };
  };
  recurring_payment_reference: string | null;
  payment_sequence: string | "oneoff";
  products: { id: number; quantity: number; name: string }[];
  price: {
    amount: number;
    currency: string;
  };
  created_at: string;
  status: { id: number; description: string };
};

type PaymentBody = {
  id?: string;
  type?: PaymentType;
  date?: string;
  subject?:
    | Payment
    | {
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
};

export const handlePayments = async (req: Request, res: Response) => {
  const { body, rawBody }: { body: PaymentBody; rawBody: Buffer } = req;

  if (!body || !rawBody || !body?.id || !body?.type || !body?.date || !body?.subject) {
    res.status(400).json({ message: "Missing parameter" });
    return;
  }

  switch (body.type) {
    case PaymentType.SUBSCRIPTION_CREATE:
    case PaymentType.SUBSCRIPTION_RENEW:
      if (!("reference" in body.subject)) {
        res.status(400).json({ message: "Missing parameter" });
        return;
      }

      break;
    case PaymentType.SUBSCRIPTION_END:
      if (!("reference" in body.subject)) {
        res.status(400).json({ message: "Missing parameter" });
        return;
      }

      await dashDataSource.manager.update(
        PremiumServices,
        { subscriptionReference: body.subject.reference },
        { subEndedAt: dayjs().format("YYYY-MM-DD  HH:mm:ss.000") }
      );

      await sendEmail(body.subject.initial_payment.customer.email, {
        subject: "Your InviteLogger subscription has ended",
        message: {
          title: "Your service will expire",
          content: `Hello, your subscription ${body.subject.reference} has been terminated for ${body.subject.cancel_reason || "not specified"}. Any problem with your service ? Feel free to contact us 👋`,
          buttonText: "Contact us",
          buttonUrl: "https://discord.gg/invitelogger-support-619859303402307604",
        },
      });
      break;
  }
};
