import nodemailer from "nodemailer";
import cron from "node-cron";
import { buildApp } from "./app.js";
import type { SendMailFn } from "./email-service.js";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 587),
  auth:
    process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
});

const sendMail: SendMailFn = async (to, subject, text) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@escola.br",
    to,
    subject,
    text
  });
};

const { app, emailService } = buildApp({ sendMail });

cron.schedule("59 23 * * *", () => {
  void emailService.runDailyNotifications();
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const start = async () => {
  try {
    await app.listen({ port, host });
    app.log.info(`Backend iniciado em http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
