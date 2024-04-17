import sgMail from "@sendgrid/mail";
import { Request, Response } from "express";

export const sendMail = async (
  to: string,
  subject: string,
  message: string,
  options: { title?: string; button_url?: string; button_txt?: string }
) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

  const msg = {
    to: to,
    from: "InviteLogger Billing <no-reply@invitelogger.me>",
    templateId: "d-64286c268f8049d0b52e9fec39ace0ca",
    subject: "InviteLogger Store - {{{subject}}}",
    dynamic_template_data: {
      subject: subject || "No subject provided",
      title: options.title || subject,
      button_url: options.button_url || "https://gold.invitelogger.me",
      button_txt: options.button_txt || "Go to the gold dashboard",
      message: message ? message : "No message provided",
    },
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent to " + to);
    })
    .catch((error) => {
      console.error(error);
    });
};

export const handleMailRequest = async (req: Request, res: Response): Promise<void> => {
  if (!req.body) {
    res.status(400).json({ message: "You didn't provide any data!" });
    return;
  }

  if (!req.body.email) {
    res.status(400).json({ message: "You didn't provide an email" });
    return;
  }
  const email = req.body.email;

  if (!req.body.subject) {
    res.status(400).json({ message: "You didn't provide a subject" });
    return;
  }
  const subject = req.body.subject;

  if (!req.body.message) {
    res.status(400).json({ message: "You didn't provide a message" });
    return;
  }
  const message = req.body.message;

  let title = subject;
  let button_url = "https://gold.invitelogger.me";
  let button_txt = "Go to the gold dashboard";
  if (req.body.options) {
    if (req.body.options.title) title = req.body.options.title;
    if (req.body.options.button_url) button_url = req.body.options.button_url;
    if (req.body.options.button_txt) button_txt = req.body.options.button_txt;
  }

  await sendMail(email, subject, message, {
    title: title,
    button_url: button_url,
    button_txt: button_txt,
  });
  res.json({ message: "Email sent" });
};
