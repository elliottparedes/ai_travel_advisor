import type { Id } from "../_generated/dataModel";

export async function requireUser(
  ctx: { db: { query: Function } },
  token: string,
): Promise<Id<"users">> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Session expired. Please sign in again.");
  }
  return session.userId;
}
