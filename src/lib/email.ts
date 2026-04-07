import nodemailer from "nodemailer";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function getTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: getRequiredEnv("ONBOARDING_EMAIL_FROM"),
      pass: getRequiredEnv("ONBOARDING_EMAIL_APP_PASSWORD"),
    },
  });
}

export async function sendEmail(message: OutboundEmail) {
  const from = getRequiredEnv("ONBOARDING_EMAIL_FROM");
  const transport = getTransport();

  await transport.sendMail({
    from: `Social Foreman <${from}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
}
