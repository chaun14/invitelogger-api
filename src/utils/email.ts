import SMTP2GOApi from "smtp2go-nodejs";

import config from "@config";
import logger, { Level } from "@utils/logger.js";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const renderHtmlEmail = (message: { title: string; content: string; buttonUrl: string; buttonText: string }) => `
<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
    <h1 style="font-size: 22px;">${escapeHtml(message.title)}</h1>
    <p>${escapeHtml(message.content).replace(/\n/g, "<br>")}</p>
    <p>
      <a href="${escapeHtml(message.buttonUrl)}" style="display: inline-block; padding: 10px 16px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
        ${escapeHtml(message.buttonText)}
      </a>
    </p>
  </body>
</html>`;

export const sendEmail = async (
  to: string,
  options: { subject: string; message: { title?: string; content?: string; buttonUrl?: string; buttonText?: string } }
) => {
  const api = SMTP2GOApi(config.smtp2goApiKey!);
  const subject = options.subject || "No subject provided";
  const message = {
    title: options.message.title || subject,
    content: options.message.content || "No message provided",
    buttonUrl: options.message.buttonUrl || "https://gold.invitelogger.me",
    buttonText: options.message.buttonText || "Go to the gold dashboard",
  };

  const mail = api
    .mail()
    .to({ email: to })
    .from({ email: "no-reply@invitelogger.me", name: "InviteLogger Billing" })
    .subject(`InviteLogger Store - ${subject}`)
    .html(renderHtmlEmail(message))
    .text(`${message.title}\n\n${message.content}\n\n${message.buttonText}: ${message.buttonUrl}`);

  await api
    .client()
    .consume(mail)
    .catch((error) => {
      logger(Level.ERROR, error);
    });
};
