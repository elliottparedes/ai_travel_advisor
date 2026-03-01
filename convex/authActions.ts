"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import type { Id } from "./_generated/dataModel";

const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AuthResult {
  token: string;
  user: {
    id: Id<"users">;
    username: string;
    displayName: string;
    createdAt: number;
  };
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const inputHash = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  try {
    return timingSafeEqual(
      Buffer.from(storedHash, "hex"),
      Buffer.from(inputHash, "hex"),
    );
  } catch {
    return false;
  }
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export const signUp = action({
  args: {
    username: v.string(),
    password: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AuthResult> => {
    const username = args.username.toLowerCase().trim();

    if (username.length < 3) throw new Error("Username must be at least 3 characters.");
    if (!/^[a-z0-9_]+$/.test(username))
      throw new Error("Username may only contain letters, numbers, and underscores.");
    if (args.password.length < 8) throw new Error("Password must be at least 8 characters.");

    const existing = await ctx.runQuery(internal.authData.getUserByUsername, { username });
    if (existing) throw new Error("Username already taken.");

    const passwordHash = hashPassword(args.password);
    const token = generateToken();
    const now = Date.now();
    const displayName = (args.displayName ?? args.username).trim() || username;

    const userId: Id<"users"> = await ctx.runMutation(internal.authData.createUser, {
      username,
      passwordHash,
      displayName,
      createdAt: now,
    });

    await ctx.runMutation(internal.authData.createSession, {
      userId,
      token,
      expiresAt: now + SESSION_MS,
    });

    return { token, user: { id: userId, username, displayName, createdAt: now } };
  },
});

export const signIn = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<AuthResult> => {
    const username = args.username.toLowerCase().trim();

    const user: {
      _id: Id<"users">;
      username: string;
      passwordHash: string;
      displayName?: string;
      createdAt: number;
    } | null = await ctx.runQuery(internal.authData.getUserByUsername, { username });

    // Generic error — don't reveal whether the username exists
    if (!user || !verifyPassword(args.password, user.passwordHash)) {
      throw new Error("Invalid username or password.");
    }

    const token = generateToken();
    const now = Date.now();

    await ctx.runMutation(internal.authData.createSession, {
      userId: user._id,
      token,
      expiresAt: now + SESSION_MS,
    });

    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName ?? user.username,
        createdAt: user.createdAt,
      },
    };
  },
});
