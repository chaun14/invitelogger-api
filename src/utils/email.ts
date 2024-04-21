import sendGrid from "@sendgrid/mail";

import config from "@config";
import logger, { Level } from "@utils/logger";

export const sendEmail = async (
  to: string,
  options: { subject: string; message: { title?: string; content?: string; buttonUrl?: string; buttonText?: string } }
) => {
  sendGrid.setApiKey(config.sendgridApiKey!);

  await sendGrid
    .send({
      to,
      from: "InviteLogger Billing <no-reply@invitelogger.me>",
      templateId: "d-64286c268f8049d0b52e9fec39ace0ca",
      subject: "InviteLogger Store - {{{subject}}}",
      dynamicTemplateData: {
        subject: options.subject || "No subject provided",
        title: options.message.title || options.subject || "No subject provided",
        button_url: options.message.buttonUrl || "https://gold.invitelogger.me",
        button_txt: options.message.buttonText || "Go to the gold dashboard",
        message: options.message.content || "No message provided",
      },
    })
    .catch((error) => {
      logger(Level.ERROR, error);
    });
};
