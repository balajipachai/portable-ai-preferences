import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFERENCES, MAX_VALUE_CHARS, parsePreferenceRecords, recordKey } from "../src/preferences.ts";

test("all records unset falls back to the named default", () => {
  const r = parsePreferenceRecords({ language: null, format: undefined });
  assert.equal(r.source, "default-unset");
  assert.deepEqual(r.preferences, DEFAULT_PREFERENCES);
  assert.equal(parsePreferenceRecords({}).source, "default-unset");
});

test("empty and whitespace values are treated as unset", () => {
  assert.equal(parsePreferenceRecords({ language: "", format: "   " }).source, "default-unset");
});

test("valid records are applied; unset ones keep defaults", () => {
  const r = parsePreferenceRecords({ language: "pt", sentenceLength: " short " });
  assert.equal(r.source, "record");
  assert.equal(r.preferences.language, "pt");
  assert.equal(r.preferences.sentenceLength, "short");
  assert.equal(r.preferences.format, DEFAULT_PREFERENCES.format);
});

test("values outside the allowlist are discarded per field", () => {
  const r = parsePreferenceRecords({ language: "klingon", format: "bullets" });
  assert.equal(r.source, "record");
  assert.equal(r.preferences.language, "en");
  assert.equal(r.preferences.format, "bullets");
  assert.deepEqual(r.ignored, ["language"]);
});

test("all-invalid records fall back to defaults", () => {
  const r = parsePreferenceRecords({ language: "{}", answerLength: "999" });
  assert.equal(r.source, "default-invalid");
  assert.deepEqual(r.preferences, DEFAULT_PREFERENCES);
  assert.deepEqual(r.ignored.sort(), ["answerLength", "language"]);
});

test("oversized values are rejected", () => {
  const r = parsePreferenceRecords({ language: "pt" + " ".repeat(5) + "x".repeat(MAX_VALUE_CHARS) });
  assert.equal(r.source, "default-invalid");
});

test("keys use the reverse-dot service namespace", () => {
  assert.equal(recordKey("language"), "app.portable-ai.language");
});
