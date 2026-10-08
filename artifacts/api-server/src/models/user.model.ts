import type { RowDataPacket } from "mysql2";
import { execute, queryRows } from "../database/mysql";
import type { UserRole } from "../middlewares/auth.middleware";

export interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  displayName: string;
  role?: UserRole;
};

const memoryUsers = new Map<number, {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}>();
let nextUserId = 1;

export async function findUserByEmail(email: string) {
  try {
    const rows = await queryRows<UserRow>(
      "SELECT id, email, password_hash, display_name, role, avatar_url, created_at, updated_at FROM users WHERE email = ? LIMIT 1",
      [email.toLowerCase()],
    );
    return rows[0] ?? null;
  } catch {
    for (const u of memoryUsers.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u as any;
    }
    return null;
  }
}

export async function findUserById(id: number) {
  try {
    const rows = await queryRows<UserRow>(
      "SELECT id, email, password_hash, display_name, role, avatar_url, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ?? null;
  } catch {
    return (memoryUsers.get(id) as any) ?? null;
  }
}

export async function createUser(input: CreateUserInput) {
  try {
    const result = await execute(
      "INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)",
      [input.email.toLowerCase(), input.passwordHash, input.displayName, input.role ?? "user"],
    );
    return findUserById(result.insertId);
  } catch {
    const id = nextUserId++;
    const user = {
      id,
      email: input.email.toLowerCase(),
      password_hash: input.passwordHash,
      display_name: input.displayName,
      role: (input.role ?? "user") as UserRole,
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    memoryUsers.set(id, user);
    return user as any;
  }
}

export async function updateUser(
  id: number,
  input: { displayName?: string; avatarUrl?: string | null },
) {
  try {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (input.displayName !== undefined) {
      updates.push("display_name = ?");
      params.push(input.displayName);
    }
    if (input.avatarUrl !== undefined) {
      updates.push("avatar_url = ?");
      params.push(input.avatarUrl);
    }
    if (!updates.length) return findUserById(id);

    params.push(id);
    const result = await execute(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );
    return result.affectedRows > 0 ? findUserById(id) : null;
  } catch {
    const user = memoryUsers.get(id);
    if (!user) return null;
    if (input.displayName !== undefined) user.display_name = input.displayName;
    if (input.avatarUrl !== undefined) user.avatar_url = input.avatarUrl;
    user.updated_at = new Date();
    return user as any;
  }
}

export async function updateUserPassword(id: number, passwordHash: string) {
  try {
    const result = await execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, id],
    );
    return result.affectedRows > 0;
  } catch {
    const user = memoryUsers.get(id);
    if (!user) return false;
    user.password_hash = passwordHash;
    user.updated_at = new Date();
    return true;
  }
}