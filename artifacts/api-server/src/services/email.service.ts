import dns from "node:dns";
import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { AppError } from "../utils/app-error";

// Force IPv4 resolution to prevent ENETUNREACH on Railway/Cloud environments
if (dns && typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

interface VerificationEntry {
  code: string;
  email: string;
  expiresAt: number;
}

// In-memory verification codes store with 10-minute TTL
const verificationStore = new Map<string, VerificationEntry>();

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of verificationStore.entries()) {
    if (entry.expiresAt < now) {
      verificationStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

async function deliverEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const normalizedEmail = to.trim().toLowerCase();

  // 1. Try Resend API first if configured
  if (env.resendApiKey && env.resendApiKey.trim().length > 0) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.resendFrom || "MatchZone <onboarding@resend.dev>",
          to: [normalizedEmail],
          subject,
          html,
        }),
      });

      const resData = (await response.json().catch(() => null)) as any;
      if (response.ok) {
        logger.info({ email: normalizedEmail, id: resData?.id }, "[EmailService] Email delivered successfully via Resend API");
        return;
      }
      logger.warn({ resData, status: response.status }, "[EmailService] Resend API rejected, falling back to SMTP");
    } catch (err: any) {
      logger.warn({ err: err?.message || err }, "[EmailService] Resend network error, falling back to SMTP");
    }
  }

  // 2. Fallback to SMTP (e.g. Gmail SMTP)
  if (!env.smtpUser || !env.smtpPass) {
    throw new AppError(
      500,
      "لم يتم ضبط إعدادات البريد في الخادم (SMTP أو RESEND_API_KEY)."
    );
  }

  const isGmail = env.smtpHost.toLowerCase().includes("gmail");
  const host = isGmail ? "smtp.gmail.com" : env.smtpHost;

  // Try port 465 (SSL)
  try {
    const transporter465 = nodemailer.createTransport({
      host,
      port: 465,
      secure: true,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
      family: 4,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    } as any);

    await transporter465.sendMail({
      from: env.smtpFrom,
      to: normalizedEmail,
      subject,
      html,
    });

    logger.info({ email: normalizedEmail }, "[EmailService] Email sent successfully via SMTP:465");
    return;
  } catch (err465: any) {
    logger.warn({ email: normalizedEmail, err: err465?.message || err465 }, "[EmailService] SMTP:465 failed, attempting port 587");
    
    // Fallback: Try port 587
    try {
      const transporter587 = nodemailer.createTransport({
        host,
        port: 587,
        secure: false,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
      } as any);

      await transporter587.sendMail({
        from: env.smtpFrom,
        to: normalizedEmail,
        subject,
        html,
      });

      logger.info({ email: normalizedEmail }, "[EmailService] Email sent successfully via SMTP:587");
      return;
    } catch (err587: any) {
      logger.error({ email: normalizedEmail, err: err587?.message || err587 }, "[EmailService] Both SMTP 465 and 587 failed");
      const errMsg = err587?.message || err465?.message || "";
      if (errMsg.includes("Username and Password not accepted")) {
        throw new AppError(400, "بيانات الدخول إلى البريد غير مقبولة (App Password غير صحيح).");
      }
      throw new AppError(400, `تعذر إرسال رمز التحقق: ${errMsg || "يرجى مراجعة إعدادات البريد"}`);
    }
  }
}

export async function sendVerificationOtp(
  email: string,
  displayName?: string
): Promise<{ success: boolean; devCode?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  // Generate secure 6-digit numeric OTP code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  verificationStore.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    expiresAt,
  });

  logger.info({ email: normalizedEmail, code }, "[EmailService] Generated verification code");

  const html = `
  <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f8fafc; padding: 32px 16px; min-height: 100%;">
    <div style="max-width: 480px; margin: 0 auto; background: #111827; border: 1px solid #253044; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="background: linear-gradient(135deg, #047857 0%, #064e3b 100%); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px;">MatchZone</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">تأكيد البريد الإلكتروني</p>
      </div>
      <div style="padding: 28px 24px; text-align: center;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #f8fafc;">مرحباً ${displayName || "بك في MatchZone"}!</h2>
        <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
          شكراً لانضمامك إلى MatchZone. يرجى استخدام رمز التحقق التالي لتأكيد بريدك الإلكتروني وإكمال إنشاء الحساب:
        </p>
        <div style="background: #080b12; border: 2px dashed #10b981; border-radius: 12px; padding: 18px; margin: 0 auto 24px; display: inline-block;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #10b981; font-family: monospace;">${code}</span>
        </div>
        <p style="margin: 0; font-size: 12.5px; color: #64748b;">
          ⚠️ هذا الرمز صالح لمدة <b>10 دقائق</b> فقط. إذا لم تكن أنت من طلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.
        </p>
      </div>
      <div style="background: #080b12; border-top: 1px solid #253044; padding: 16px; text-align: center; font-size: 11px; color: #64748b;">
        MatchZone · منصة البث المباشر ومتابعة كرة القدم العالمية
      </div>
    </div>
  </div>
  `;

  await deliverEmail({
    to: normalizedEmail,
    subject: `MatchZone - رمز التحقق الخاص بك: ${code}`,
    html,
  });

  return { success: true };
}

export async function sendPasswordResetOtp(
  email: string,
  displayName?: string
): Promise<{ success: boolean; devCode?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  // Generate secure 6-digit numeric OTP code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  verificationStore.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    expiresAt,
  });

  logger.info({ email: normalizedEmail, code }, "[EmailService] Generated password reset code");

  const html = `
  <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f8fafc; padding: 32px 16px; min-height: 100%;">
    <div style="max-width: 480px; margin: 0 auto; background: #111827; border: 1px solid #253044; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="background: linear-gradient(135deg, #047857 0%, #064e3b 100%); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px;">MatchZone</h1>
        <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">استعادة كلمة المرور</p>
      </div>
      <div style="padding: 28px 24px; text-align: center;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #f8fafc;">مرحباً ${displayName || "بك"}!</h2>
        <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
          تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في MatchZone. يرجى استخدام رمز التحقق التالي لإتمام إعادة التعيين:
        </p>
        <div style="background: #080b12; border: 2px dashed #10b981; border-radius: 12px; padding: 18px; margin: 0 auto 24px; display: inline-block;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #10b981; font-family: monospace;">${code}</span>
        </div>
        <p style="margin: 0; font-size: 12.5px; color: #64748b;">
          ⚠️ هذا الرمز صالح لمدة <b>10 دقائق</b> فقط. إذا لم تكن أنت من طلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة وحسابك في أمان تام.
        </p>
      </div>
      <div style="background: #080b12; border-top: 1px solid #253044; padding: 16px; text-align: center; font-size: 11px; color: #64748b;">
        MatchZone · منصة البث المباشر ومتابعة كرة القدم العالمية
      </div>
    </div>
  </div>
  `;

  await deliverEmail({
    to: normalizedEmail,
    subject: `MatchZone - رمز استعادة كلمة المرور: ${code}`,
    html,
  });

  return { success: true };
}

export function verifyOtp(email: string, code: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = verificationStore.get(normalizedEmail);

  if (!entry) {
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    verificationStore.delete(normalizedEmail);
    return false;
  }

  if (entry.code.trim() === code.trim()) {
    verificationStore.delete(normalizedEmail);
    return true;
  }

  return false;
}
