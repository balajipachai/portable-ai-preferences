import { z } from "zod";

// ENS text record key holding the user's preferences as a small JSON object.
export const PREFERENCE_KEY = "ai.preferences";
// Records larger than this are treated as nonsense and ignored.
export const MAX_RECORD_CHARS = 2000;

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

export type PreferenceSource =
  | "record" // at least one valid field came from the ENS record
  | "default-unset" // record missing or empty
  | "default-invalid"; // record present but unusable

export interface ParsedPreferences {
  preferences: Preferences;
  source: PreferenceSource;
  // Names of known fields whose values were rejected (never raw record text).
  ignored: string[];
  unknownKeys: number;
}

const FIELD_NAMES = Object.keys(fieldSchemas) as (keyof Preferences)[];

function defaults(source: PreferenceSource): ParsedPreferences {
  return { preferences: { ...DEFAULT_PREFERENCES }, source, ignored: [], unknownKeys: 0 };
}

/**
 * Turn a raw ENS text record value (or null) into safe preferences.
 * Never throws; every failure mode ends in a defined default.
 */
export function parsePreferenceRecord(raw: string | null | undefined): ParsedPreferences {
  // Explicit branch: unset / empty record -> named default.
  if (raw === null || raw === undefined || raw.trim() === "") {
    return defaults("default-unset");
  }
  if (raw.length > MAX_RECORD_CHARS) {
    return defaults("default-invalid");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults("default-invalid");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return defaults("default-invalid");
  }

  const obj = parsed as Record<string, unknown>;
  const result = defaults("record");
  const prefs = result.preferences as Record<keyof Preferences, string>;

  for (const name of FIELD_NAMES) {
    if (!Object.hasOwn(obj, name)) continue;
    const check = fieldSchemas[name].safeParse(obj[name]);
    if (check.success) {
      prefs[name] = check.data;
    } else {
      result.ignored.push(name); // value discarded, default kept
    }
  }
  result.unknownKeys = Object.keys(obj).filter(
    (k) => !(FIELD_NAMES as string[]).includes(k),
  ).length;

  const acceptedAny = FIELD_NAMES.some((n) => Object.hasOwn(obj, n) && !result.ignored.includes(n));
  if (!acceptedAny) result.source = "default-invalid";
  return result;
}
