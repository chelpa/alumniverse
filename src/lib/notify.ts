import "server-only";
import nodemailer from "nodemailer";
import { db } from "./db";
import { digitsOnly } from "./utils";

/**
 * Outbound messaging. Every message is recorded in the Outbox table.
 * If the transport isn't configured the message is LOGGED (visible in the dashboard) rather than sent.
 */

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function mailer() {
  if (!process.env.SMTP_URL) return null;
  if (!transporter) transporter = nodemailer.createTransport(process.env.SMTP_URL);
  return transporter;
}

export async function sendEmail(opts: { brokerId?: string | null; to: string; subject: string; text: string; replyTo?: string }) {
  const t = mailer();
  let status = "LOGGED";
  let error: string | null = null;
  if (t) {
    try {
      await t.sendMail({
        from: process.env.MAIL_FROM || "Brokersite <no-reply@brokersite.app>",
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        replyTo: opts.replyTo,
      });
      status = "SENT";
    } catch (e) {
      status = "FAILED";
      error = e instanceof Error ? e.message : String(e);
    }
  } else {
    console.log(`[email:logged] to=${opts.to} subject="${opts.subject}"`);
  }
  await db.outboxMessage.create({
    data: { brokerId: opts.brokerId ?? null, channel: "EMAIL", to: opts.to, subject: opts.subject, body: opts.text, status, error },
  });
  return status;
}

export async function sendWhatsApp(opts: { brokerId?: string | null; to: string; text: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = `whatsapp:+${digitsOnly(opts.to)}`;
  let status = "LOGGED";
  let error: string | null = null;
  if (sid && token && from) {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: to, Body: opts.text }),
      });
      if (res.ok) status = "SENT";
      else {
        status = "FAILED";
        error = `Twilio ${res.status}: ${(await res.text()).slice(0, 300)}`;
      }
    } catch (e) {
      status = "FAILED";
      error = e instanceof Error ? e.message : String(e);
    }
  } else {
    console.log(`[whatsapp:logged] to=${to}`);
  }
  await db.outboxMessage.create({
    data: { brokerId: opts.brokerId ?? null, channel: "WHATSAPP", to, body: opts.text, status, error },
  });
  return status;
}
