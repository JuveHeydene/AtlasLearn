import nodemailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASS, EMAIL_ENABLED } from "../utils/constants";

// Gmail transporter, only created when credentials are configured.
const transporter = EMAIL_ENABLED
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })
  : null;

if (!EMAIL_ENABLED) {
  console.warn("EMAIL_USER / EMAIL_PASS not set: emails will be printed to the console instead of being sent.");
}

// Send an email (or print it to the console in development mode)
export const sendEmail = async (to: string, subject: string, text: string, html?: string): Promise<void> => {
  if (!transporter) {
    console.log(`\n[email] to: ${to}\n[email] subject: ${subject}\n[email] ${text}\n${html ? `[email] html: ${html}\n` : ""}`);
    return;
  }
  await transporter.sendMail({ from: EMAIL_USER, to, subject, text, html });
};

export const sendVerificationCode = async (to: string, code: string): Promise<void> => {
  await sendEmail(to, "Your Verification Code", `Your verification code is: ${code}`);
};
