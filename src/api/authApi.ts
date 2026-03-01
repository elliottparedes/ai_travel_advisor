import { convexClient } from "./client";
import { api } from "../../convex/_generated/api";
import type { AuthResult, AuthUser } from "../types/auth";

export async function signUp(
  username: string,
  password: string,
  displayName?: string,
): Promise<AuthResult> {
  return await convexClient.action(api.authActions.signUp, {
    username,
    password,
    displayName,
  });
}

export async function signIn(
  username: string,
  password: string,
): Promise<AuthResult> {
  return await convexClient.action(api.authActions.signIn, { username, password });
}

export async function signOut(token: string): Promise<void> {
  await convexClient.mutation(api.authData.signOut, { token });
}

export async function getSessionUser(token: string): Promise<AuthUser | null> {
  return await convexClient.query(api.authData.getSessionUser, { token });
}

export async function updateProfile(
  token: string,
  displayName: string,
): Promise<AuthUser> {
  return await convexClient.mutation(api.authData.updateProfile, {
    token,
    displayName,
  });
}

export async function generateAvatarUploadUrl(token: string): Promise<string> {
  return await convexClient.mutation(api.authData.generateAvatarUploadUrl, { token });
}

export async function saveAvatar(token: string, storageId: string): Promise<string | null> {
  return await convexClient.mutation(api.authData.saveAvatar, {
    token,
    storageId: storageId as any,
  });
}
