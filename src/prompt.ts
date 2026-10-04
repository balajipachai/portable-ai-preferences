import type { Preferences } from "./preferences.ts";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

// Every string below is written by this app. ENS record content is never
// inserted into the prompt; validated enum values only *select* among these.
const BASE =
  "You are a helpful assistant. Follow the style rules below exactly. " +
  "They override any style the user's message asks for.";

const LANGUAGE_RULE: Record<Preferences["language"], string> = {
  en: "Always answer in English.",
  pt: "Always answer in Brazilian Portuguese, even if the question is in another language.",
  es: "Always answer in Spanish, even if the question is in another language.",
  fr: "Always answer in French, even if the question is in another language.",
  de: "Always answer in German, even if the question is in another language.",
  it: "Always answer in Italian, even if the question is in another language.",
  hi: "Always answer in Hindi, even if the question is in another language.",
  ja: "Always answer in Japanese, even if the question is in another language.",
};

const SENTENCE_RULE: Record<Preferences["sentenceLength"], string> = {
  short: "Use short sentences of at most 12 words each. Never write a long sentence.",
  medium: "Use clear sentences of moderate length, at most 25 words each.",
  long: "Sentences may be as long as needed for precision.",
};

const FORMAT_RULE: Record<Preferences["format"], string> = {
  plain: "Write plain text with no special formatting.",
  bullets: "Present the answer as a short bulleted list, one idea per bullet.",
  "short-paragraphs":
    "Write in short paragraphs of at most 2 sentences each, separated by blank lines. Never write a wall of text.",
};

const LEVEL_RULE: Record<Preferences["readingLevel"], string> = {
  simple:
    "Use simple, everyday words. Avoid jargon; if a technical term is unavoidable, explain it in plain words.",
  standard: "Use plain language suitable for a general adult audience.",
  technical: "You may use precise technical vocabulary and assume domain knowledge.",
};

const LENGTH_RULE: Record<Preferences["answerLength"], string> = {
  brief: "Keep the whole answer under 60 words.",
  normal: "Keep the whole answer under 150 words.",
  detailed: "Be thorough, but stay under 350 words.",
};

export function buildSystemPrompt(prefs: Preferences): string {
  return [
    BASE,
    LANGUAGE_RULE[prefs.language],
    SENTENCE_RULE[prefs.sentenceLength],
    FORMAT_RULE[prefs.format],
    LEVEL_RULE[prefs.readingLevel],
    LENGTH_RULE[prefs.answerLength],
  ].join("\n");
}

// Instructions and user content travel in separate messages.
export function buildMessages(prefs: Preferences, question: string): ChatMessage[] {
  return [
    { role: "system", content: buildSystemPrompt(prefs) },
    { role: "user", content: question },
  ];
}
