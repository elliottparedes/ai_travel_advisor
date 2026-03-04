import { convexClient } from "./client";
import { api } from "../../convex/_generated/api";
import type { UserList, ListItem } from "../types/lists";
import type { Id } from "../../convex/_generated/dataModel";

export async function getUserLists(token: string): Promise<UserList[]> {
  const raw = await convexClient.query(api.listsData.getUserLists, { token });
  return (raw ?? []).map((l: any) => ({ ...l, id: l.id as string }));
}

export async function getListFsqIds(token: string): Promise<string[]> {
  return await convexClient.query(api.listsData.getListFsqIds, { token }) ?? [];
}

export async function createList(token: string, name: string, emoji: string): Promise<string> {
  return await convexClient.mutation(api.listsData.createList, { token, name, emoji }) as string;
}

export async function deleteList(token: string, listId: string): Promise<void> {
  await convexClient.mutation(api.listsData.deleteList, {
    token,
    listId: listId as Id<"userLists">,
  });
}

export async function addToList(token: string, listId: string, item: ListItem): Promise<void> {
  await convexClient.mutation(api.listsData.addToList, {
    token,
    listId: listId as Id<"userLists">,
    item,
  });
}

export async function removeFromList(token: string, listId: string, fsqId?: string, title?: string): Promise<void> {
  await convexClient.mutation(api.listsData.removeFromList, {
    token,
    listId: listId as Id<"userLists">,
    fsqId,
    title,
  });
}

export async function renameList(token: string, listId: string, name: string, emoji: string): Promise<void> {
  await convexClient.mutation(api.listsData.renameList, {
    token,
    listId: listId as Id<"userLists">,
    name,
    emoji,
  });
}
