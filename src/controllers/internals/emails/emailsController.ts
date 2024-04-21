import { Request, Response } from "express";

import { sendEmail } from "@utils/email";

type EmailBody = {
  email: string;
  subject: string;
  message: string;
  options?: {
    title?: string;
    button_url?: string;
    button_txt?: string;
  };
};

export const handleEmail = async (req: Request, res: Response) => {
  const { body }: { body?: EmailBody } = req;

  if (!body || !body?.email || !body?.subject || !body?.message) {
    res.status(400).json({ message: "Missing parameter" });
    return;
  }

  await sendEmail(body.email, {
    subject: body.subject,
    message: {
      title: body.options?.title,
      content: body.message,
      buttonText: body.options?.button_txt || "Go to the gold dashboard",
      buttonUrl: body.options?.button_url || "https://gold.invitelogger.me",
    },
  });

  res.status(200).send({ message: "Email sent" });
};
