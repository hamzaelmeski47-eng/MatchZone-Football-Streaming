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

export async function findUserByEmail(email: string) {
  const rows = await queryRows<UserRow>(
    "SELECT id, email, password_hash, display_name, role, avatar_url, created_at, updated_at FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  const rows = await queryRows<UserRow>(
    "SELECT id, email, password_hash, display_name, role, avatar_url, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export async function createUser(input: CreateUserInput) {
  const result = await execute(
    "INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)",
    [input.email, input.passwordHash, input.displayName, input.role ?? "user"],
  );
  return findUserById(result.insertId);
}

export async function updateUser(
  id: number,
  input: { displayName?: string; avatarUrl?: string | null },
) {
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
}