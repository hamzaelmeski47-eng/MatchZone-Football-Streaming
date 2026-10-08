import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { createAccessToken } from "../middlewares/auth.middleware";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  updateUserPassword,
} from "../models/user.model";
import { AppError } from "../utils/app-error";
import {
  sendPasswordResetOtp,
  sendVerificationOtp,
  verifyOtp,
} from "../services/email.service";

const SALT_ROUNDS = 12;

function serializeUser(user: NonNullable<Awaited<ReturnType<typeof findUserById>>>) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export async function requestVerification(req: Request, res: Response) {
  const { email, displayName } = req.body;
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.");
  }

  const result = await sendVerificationOtp(email, displayName);
  res.json({
    success: true,
    message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.",
    devCode: result.devCode,
  });
}

export async function verifyAndRegister(req: Request, res: Response) {
  const { email, code, password, displayName } = req.body;

  const isValidOtp = verifyOtp(email, code);
  if (!isValidOtp) {
    throw new AppError(400, "رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى إعادة المحاولة.");
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, "هذا البريد الإلكتروني مسجل بالفعل.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ email, passwordHash, displayName });
  if (!user) {
    throw new AppError(500, "تعذر إنشاء الحساب");
  }

  const safeUser = serializeUser(user);
  res.status(201).json({
    user: safeUser,
    token: createAccessToken({
      id: safeUser.id,
      email: safeUser.email,
      displayName: safeUser.displayName,
      role: safeUser.role,
    }),
  });
}

export async function register(req: Request, res: Response) {
  const { email, password, displayName } = req.body;
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, "An account with that email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ email, passwordHash, displayName });
  if (!user) {
    throw new AppError(500, "Unable to create account");
  }

  const safeUser = serializeUser(user);
  res.status(201).json({ user: safeUser, token: createAccessToken({
    id: safeUser.id,
    email: safeUser.email,
    displayName: safeUser.displayName,
    role: safeUser.role,
  }) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError(401, "Invalid email or password");
  }

  const safeUser = serializeUser(user);
  res.json({ user: safeUser, token: createAccessToken({
    id: safeUser.id,
    email: safeUser.email,
    displayName: safeUser.displayName,
    role: safeUser.role,
  }) });
}

export async function getCurrentUser(req: Request, res: Response) {
  const user = await findUserById(req.user!.id);
  if (!user) {
    throw new AppError(401, "User account no longer exists");
  }
  res.json({ user: serializeUser(user) });
}

export async function updateCurrentUser(req: Request, res: Response) {
  const user = await updateUser(req.user!.id, {
    displayName: req.body.displayName,
    avatarUrl: req.body.avatarUrl,
  });
  if (!user) {
    throw new AppError(404, "User account not found");
  }
  res.json({ user: serializeUser(user) });
}

export async function googleAuth(req: Request, res: Response) {
  let { credential, email, displayName, avatarUrl } = req.body;

  if (credential) {
    try {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (googleRes.ok) {
        const payload = (await googleRes.json()) as {
          email?: string;
          name?: string;
          picture?: string;
          email_verified?: string | boolean;
        };
        if (payload.email) {
          email = payload.email.toLowerCase();
          displayName = payload.name || displayName || email.split('@')[0];
          avatarUrl = payload.picture || avatarUrl;
        }
      } else {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload.email) {
            email = payload.email.toLowerCase();
            displayName = payload.name || displayName || email.split('@')[0];
            avatarUrl = payload.picture || avatarUrl;
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  if (!email) {
    throw new AppError(400, "Google authentication failed: missing email address");
  }

  let user = await findUserByEmail(email.toLowerCase());

  if (!user) {
    const passwordHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), SALT_ROUNDS);
    const name = displayName || email.split('@')[0] || 'مشجع MatchZone';
    user = await createUser({
      email: email.toLowerCase(),
      passwordHash,
      displayName: name,
    });
    if (!user) {
      throw new AppError(500, "Unable to create account with Google");
    }
  }

  if (avatarUrl || displayName) {
    await updateUser(user.id, {
      avatarUrl: avatarUrl || user.avatar_url,
      displayName: displayName || user.display_name,
    });
    user = (await findUserById(user.id)) ?? user;
  }

  const safeUser = serializeUser(user);
  res.json({
    user: safeUser,
    token: createAccessToken({
      id: safeUser.id,
      email: safeUser.email,
      displayName: safeUser.displayName,
      role: safeUser.role,
    }),
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(404, "لا يوجد حساب مسجل بهذا البريد الإلكتروني.");
  }

  const result = await sendPasswordResetOtp(email, user.display_name);
  res.json({
    success: true,
    message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.",
    devCode: result.devCode,
  });
}

export async function resetPassword(req: Request, res: Response) {
  const { email, code, newPassword } = req.body;

  const isValidOtp = verifyOtp(email, code);
  if (!isValidOtp) {
    throw new AppError(400, "رمز التحقق غير صحيح أو انتهت صلاحيته.");
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(404, "المستخدم غير موجود.");
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await updateUserPassword(user.id, passwordHash);

  const safeUser = serializeUser(user);
  res.json({
    success: true,
    message: "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.",
    user: safeUser,
    token: createAccessToken({
      id: safeUser.id,
      email: safeUser.email,
      displayName: safeUser.displayName,
      role: safeUser.role,
    }),
  });
}