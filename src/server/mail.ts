/**
 * Outgoing email (sign-in codes, parent messages, help-request replies) over SMTP.
 * SMTP_URL examples: smtps://user:pass@smtp.gmail.com:465, smtp://apikey:KEY@smtp.sendgrid.net:587
 * Without SMTP_URL nothing is sent: in development the message is printed to the console instead;
 * in production it's dropped and the caller is told (so the UI never claims an email went out).
 */
import nodemailer from "nodemailer";
import { isProduction } from "./config";

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;
const configured = () => Boolean(process.env.SMTP_URL);

export const mailEnabled = configured;

function getTransport() {
  if (!transport) transport = nodemailer.createTransport(process.env.SMTP_URL!);
  return transport;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  /** Short HTML version (escaped text with line breaks is used when omitted) */
  html?: string;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sends one email. Resolves to whether it was handed to the mail server. Never throws. */
export async function sendMail(m: Mail): Promise<boolean> {
  if (!configured()) {
    if (!isProduction()) console.log(`[mail][dev] to ${m.to}: ${m.subject}\n${m.text}`);
    return false;
  }
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || "21K School <no-reply@21k.school>",
      to: m.to,
      subject: m.subject,
      text: m.text,
      html: m.html || `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${escape(m.text).replace(/\n/g, "<br>")}</div>`,
    });
    return true;
  } catch (err: any) {
    console.warn("[mail] send failed:", err?.message || err);
    return false;
  }
}
