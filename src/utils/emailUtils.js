import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const createSmtpTransporter = () =>
  nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    requireTLS: true,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

export const sendEmail = async ({ to, subject, html }) => {
  const transporter = createSmtpTransporter();

  try {
    return await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
    });
  } finally {
    transporter.close();
  }
};

export const verifySmtpConnection = async () => {
  const transporter = createSmtpTransporter();
  try {
    await transporter.verify();
    return { ok: true, message: "SMTP connection verified." };
  } catch (error) {
    return {
      ok: false,
      message: error.message || "SMTP connection failed.",
      code: error.code || null,
    };
  } finally {
    transporter.close();
  }
};

const buildClientAuthUrl = (path, rawToken) => {
  const baseUrl = new URL(env.clientUrl);
  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  baseUrl.pathname = `${basePath}/${path}`;
  baseUrl.search = "";
  baseUrl.hash = "";
  baseUrl.searchParams.set("token", rawToken);
  return baseUrl.toString();
};

export const buildVerificationEmail = (email, rawToken) => {
  const verifyUrl = buildClientAuthUrl("verify-email", rawToken);
  return {
    to: email,
    subject: "Verify your StockPilot account",
    html: `
      <p>Welcome to StockPilot.</p>
      <p>Please verify your email address by clicking the link below. This link expires in 24 hours.</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    `,
  };
};

export const buildPasswordResetEmail = (email, rawToken) => {
  const resetUrl = buildClientAuthUrl("reset-password", rawToken);
  return {
    to: email,
    subject: "Reset your StockPilot password",
    html: `
      <p>We received a request to reset your password.</p>
      <p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
    `,
  };
};

export const sendVerificationEmail = async (email, rawToken) =>
  sendEmail(buildVerificationEmail(email, rawToken));

export const sendPasswordResetEmail = async (email, rawToken) =>
  sendEmail(buildPasswordResetEmail(email, rawToken));
