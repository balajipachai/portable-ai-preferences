import { z } from "zod";

// One ENS text record per preference, using an ENSIP-5 reverse-dot service-key
// namespace, e.g. `app.portable-ai.language` = `pt`. Plain values, so they can be
// edited as ordinary text records in the ENS app.
export const KEY_NAMESPACE = "app.portable-ai";
// Values longer than this are treated as nonsense before validation.
export const MAX_VALUE_CHARS = 64;

export const LANGUAGES = ["en", "pt", "es", "fr", "de", "it", "hi", "ja"] as const;
export const SENTENCE_LENGTHS = ["short", "medium", "long"] as const;
export const FORMATS = ["plain", "bullets", "short-paragraphs"] as const;
export const READING_LEVELS = ["simple", "standard", "technical"] as const;
export const ANSWER_LENGTHS = ["brief", "normal", "detailed"] as const;

// Allowlist per preference: any value outside these sets is discarded.
const fieldSchemas = {
  language: z.enum(LANGUAGES),
  sentenceLength: z.enum(SENTENCE_LENGTHS),
  format: z.enum(FORMATS),
  readingLevel: z.enum(READING_LEVELS),
  answerLength: z.enum(ANSWER_LENGTHS),
} as const;

export type Preferences = {
  [K in keyof typeof fieldSchemas]: z.infer<(typeof fieldSchemas)[K]>;
};

export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
  language: "en",
  sentenceLength: "medium",
  format: "plain",
  readingLevel: "standard",
  answerLength: "normal",
});

export type PreferenceName = keyof Preferences;
export const PREFERENCE_NAMES = Object.keys(fieldSchemas) as PreferenceName[];

export function recordKey(name: PreferenceName): string {
  return `${KEY_NAMESPACE}.${name}`;
}

/** Raw text record values by preference name; null/undefined when unset. */
export type RawRecords = Partial<Record<PreferenceName, string | null | undefined>>;

export type PreferenceSource =
  | "record" // at least one valid value came from ENS
  | "default-unset" // no preference records set on the name
  | "default-invalid"; // records present but none usable

export interface ParsedPreferences {
  preferences: Preferences;
  source: PreferenceSource;
  // Names of known preferences whose values were rejected (never raw record text).
  ignored: PreferenceName[];
}

/**
 * Turn raw ENS text record values into safe preferences.
 * Never throws; every failure mode ends in a defined default.
 */
export function parsePreferenceRecords(raw: RawRecords): ParsedPreferences {
  const prefs: Record<PreferenceName, string> = { ...DEFAULT_PREFERENCES };
  const ignored: PreferenceName[] = [];
  let present = 0;
  let accepted = 0;

  for (const name of PREFERENCE_NAMES) {
    const value = raw[name];
    // Explicit branch: unset / empty record -> keep the named default.
    if (value === null || value === undefined || value.trim() === "") continue;
    present++;
    const check = value.length <= MAX_VALUE_CHARS ? fieldSchemas[name].safeParse(value.trim()) : null;
    if (check?.success) {
      prefs[name] = check.data;
      accepted++;
    } else {
      ignored.push(name); // discarded, default kept
    }
  }

  const source: PreferenceSource =
    present === 0 ? "default-unset" : accepted === 0 ? "default-invalid" : "record";
  return { preferences: prefs as Preferences, source, ignored };
}
