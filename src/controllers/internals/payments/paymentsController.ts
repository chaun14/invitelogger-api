import { NextFunction, Request, Response } from "express";
import dayjs, { ManipulateType } from "dayjs";

import PremiumServices, { PremiumServiceStatus, PremiumServiceType } from "@entity/dash/PremiumServices.js";
import PremiumPlans, { PremiumPlanCategory, PremiumPlanPeriod } from "@entity/dash/PremiumPlans.js";
import Payments from "@entity/dash/Payments.js";

import { dashDataSource } from "@config/orm";

import { sendEmail } from "@utils/email.js";

enum PaymentType {
  SUBSCRIPTION_RENEW = "recurring-payment.renewed",
  SUBSCRIPTION_CREATE = "recurring-payment.started",
  SUBSCRIPTION_END = "recurring-payment.ended",
  PAYMENT_CREATED = "payment.completed",
  PAYMENT_REFUNDED = "payment.refunded",
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

type RecurringPayment = {
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

type PaymentBody = {
  id?: string;
  type?: PaymentType;
  date?: string;
  subject?: Payment | RecurringPayment;
};

export const handlePayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body, rawBody }: { body: PaymentBody; rawBody: Buffer } = req;

    if (!body || !rawBody || !body?.id || !body?.type || !body?.date || !body?.subject) {
      res.status(400).json({ message: "Missing parameter" });
      return;
    }

    const { subject } = body;

    switch (body.type) {
      case PaymentType.SUBSCRIPTION_CREATE:
      case PaymentType.SUBSCRIPTION_RENEW:
        if (!("reference" in subject)) {
          res.status(400).json({ message: "Missing parameter" });
          return;
        }

        res.status(200).send({ id: body.id });

        for (const plan of subject.last_payment.products) {
          for (let i = 0; i < plan.quantity; i++) {
            const currentPlan = await dashDataSource.manager.findOne(PremiumPlans, {
              where: { tebexPackageId: plan.id.toString() },
            });

            if (!currentPlan) {
              return;
            }

            const matchingService = await dashDataSource.manager.findOne(PremiumServices, {
              where: {
                userId: subject.last_payment.customer.username.id,
                planId: currentPlan.id,
                subscriptionReference: subject.reference,
                type: PremiumServiceType.SUB,
              },
            });

            const sqlDatetime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000)
              .toJSON()
              .slice(0, 19)
              .replace("T", " ");
            const nextDue = dayjs(subject.next_payment_at).format("YYYY-MM-DD");

            if (matchingService) {
              matchingService.nextDue = nextDue;
              matchingService.status = PremiumServiceStatus.ACTIVE;
              matchingService.updatedAt = sqlDatetime;

              await dashDataSource.manager.save(matchingService);
              return;
            }

            await dashDataSource.manager.insert(PremiumServices, {
              userId: subject.last_payment.customer.username.id,
              status: PremiumServiceStatus.ACTIVE,
              createdAt: sqlDatetime,
              updatedAt: sqlDatetime,
              planId: currentPlan.id,
              subscriptionReference: subject.reference,
              renewedAt: sqlDatetime,
              suspendedAt: null,
              nextDue,
              type: PremiumServiceType.SUB,
            });
          }
        }

        break;
      case PaymentType.SUBSCRIPTION_END:
        if (!("reference" in subject)) {
          res.status(400).json({ message: "Missing parameter" });
          return;
        }

        res.status(200).send({ id: body.id });

        await dashDataSource.manager.update(
          PremiumServices,
          { subscriptionReference: subject.reference },
          { subEndedAt: dayjs().format("YYYY-MM-DD  HH:mm:ss.000") }
        );

        await sendEmail(subject.initial_payment.customer.email, {
          subject: "Your InviteLogger subscription has ended",
          message: {
            title: "Your service will expire",
            content: `Hello, your subscription ${subject.reference} has been terminated for ${subject.cancel_reason || "not specified"}. Any problem with your service ? Feel free to contact us 👋`,
            buttonText: "Contact us",
            buttonUrl: "https://discord.gg/invitelogger-support-619859303402307604",
          },
        });

        break;
      case PaymentType.PAYMENT_CREATED:
        if (!("transaction_id" in subject)) {
          res.status(400).json({ message: "Missing parameter" });
          return;
        }

        const existPayment = await dashDataSource.manager.findOne(Payments, {
          where: { paymentId: subject.transaction_id },
        });

        if (existPayment) {
          res.status(403).json({ message: "Payment already exists" });
          return;
        }

        res.status(200).send({ id: body.id });

        const sqlDatetime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000)
          .toJSON()
          .slice(0, 19)
          .replace("T", " ");

        await dashDataSource.manager.insert(Payments, {
          paymentId: subject.transaction_id,
          amount: subject.price.amount,
          date: subject.created_at,
          status: subject.status.description,
          currency: subject.price.currency,
          mail: subject.customer.email,
          username: subject.customer.username.username,
          discordId: subject.customer.username.id,
          packages: subject.products.map((pkg) => pkg.id.toString()),
          subscriptionReference: subject.recurring_payment_reference,
          createdAt: sqlDatetime,
          updatedAt: sqlDatetime,
        });

        if (subject.recurring_payment_reference) {
          return;
        }

        for (const plan of subject.products) {
          for (let i = 0; i < plan.quantity; i++) {
            const currentPlan = await dashDataSource.manager.findOne(PremiumPlans, {
              where: { tebexPackageId: plan.id.toString() },
            });

            if (!currentPlan) {
              return;
            }

            const matchingService = await dashDataSource.manager.findOne(PremiumServices, {
              where: {
                userId: subject.customer.username.id,
                planId: currentPlan.id,
                type: PremiumServiceType.SUB,
              },
            });

            if (matchingService) {
              if (currentPlan.period === PremiumPlanPeriod.MONTHLY) {
                matchingService.nextDue = dayjs().add(1, "month").format("YYYY-MM-DD");
              } else if (currentPlan.period === PremiumPlanPeriod.YEARLY) {
                matchingService.nextDue = dayjs().add(1, "year").format("YYYY-MM-DD");
              }

              matchingService.status = PremiumServiceStatus.ACTIVE;
              await dashDataSource.manager.save(matchingService);

              return;
            }

            const nextDue = dayjs()
              .add(1, currentPlan.period.replace("ly", "") as ManipulateType)
              .format("YYYY-MM-DD");

            await dashDataSource.manager.insert(PremiumServices, {
              userId: subject.customer.username.id,
              status: PremiumServiceStatus.ACTIVE,
              createdAt: sqlDatetime,
              updatedAt: sqlDatetime,
              planId: currentPlan.id,
              subscriptionReference: null,
              renewedAt: sqlDatetime,
              suspendedAt: null,
              nextDue,
              type: PremiumServiceType.SUB,
            });

            if (currentPlan.category === PremiumPlanCategory.GOLD) {
              await sendEmail(subject.customer.email, {
                subject: "Your purchase on InviteLogger has been processed",
                message: {
                  title: "Thanks for your purchase",
                  content: `Hello, your ${currentPlan.name} has been activated successfully. To activate InviteLogger gold on your server, please login on the Gold dashboard, select your service and insert your server id`,
                },
              });
            } else if (currentPlan.category === PremiumPlanCategory.PBI) {
              await sendEmail(subject.customer.email, {
                subject: "Your purchase on InviteLogger has been processed",
                message: {
                  title: "Thanks for your purchase",
                  content: `Hello, your ${currentPlan.name} has been activated successfully. To activate your private bot instance, join our support server and run the tutorial below.`,
                  buttonText: "Private bot setup tutorial",
                  buttonUrl: "https://docs.invitelogger.me/pbi/get-pbi/setup-your-private-bot-instance",
                },
              });
            }
          }
        }

        break;
      case PaymentType.PAYMENT_REFUNDED:
        if (!("transaction_id" in subject)) {
          res.status(400).json({ message: "Missing parameter" });
          return;
        }

        res.status(200).send({ id: body.id });

        await dashDataSource.manager.update(
          Payments,
          { paymentId: subject.transaction_id },
          { status: subject.status.description, refundedAt: dayjs().format("YYYY-MM-DD HH:mm:ss.000") }
        );

        await sendEmail(subject.customer.email, {
          subject: "Your payment has been refunded",
          message: {
            title: "You've been refunded",
            content: `Hello, your payment ${subject.transaction_id} for ${subject.products[0].name} (${subject.price.amount} ${subject.price.currency}) has been refunded, the process may take up to a few days to complete. ⚠️ Your service might be suspended depending on the context, reach to us for more information's`,
            buttonText: "Contact us",
            buttonUrl: "https://discord.gg/invitelogger-support-619859303402307604",
          },
        });

        break;
    }
  } catch (error) {
    next(error);
  }
};
