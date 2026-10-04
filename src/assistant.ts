import { readPreferenceRecords, type RecordRead } from "./ens.ts";
import { chat } from "./llm.ts";
import { buildMessages, type ChatMessage } from "./prompt.ts";
import { parsePreferenceRecords, type ParsedPreferences } from "./preferences.ts";

export interface Deps {
  readRecord: (name: string) => Promise<RecordRead>;
  chat: (messages: ChatMessage[]) => Promise<string>;
}

const defaultDeps: Deps = {
  readRecord: (name) => readPreferenceRecords(name),
  chat: (messages) => chat(messages),
};

export interface Resolved extends ParsedPreferences {
  ensName: string;
}

export async function resolvePreferences(
  name: string,
  deps: Pick<Deps, "readRecord"> = defaultDeps,
): Promise<Resolved> {
  const { ensName, raw } = await deps.readRecord(name);
  return { ensName, ...parsePreferenceRecords(raw) };
}

export async function answer(
  name: string,
  question: string,
  deps: Deps = defaultDeps,
): Promise<Resolved & { answer: string }> {
  const resolved = await resolvePreferences(name, deps);
  const text = await deps.chat(buildMessages(resolved.preferences, question));
  return { ...resolved, answer: text };
}
