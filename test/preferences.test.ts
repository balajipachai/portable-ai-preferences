import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFERENCES, MAX_RECORD_CHARS, parsePreferenceRecord } from "../src/preferences.ts";

test("null record falls back to the named default", () => {
  const r = parsePreferenceRecord(null);
  assert.equal(r.source, "default-unset");
  assert.deepEqual(r.preferences, DEFAULT_PREFERENCES);
});

test("empty and whitespace records are treated as unset", () => {
  assert.equal(parsePreferenceRecord("").source, "default-unset");
  assert.equal(parsePreferenceRecord("   ").source, "default-unset");
  assert.equal(parsePreferenceRecord(undefined).source, "default-unset");
});

test("valid record is applied", () => {
  const r = parsePreferenceRecord('{"language":"pt","sentenceLength":"short"}');
  assert.equal(r.source, "record");
  assert.equal(r.preferences.language, "pt");
  assert.equal(r.preferences.sentenceLength, "short");
  assert.equal(r.preferences.format, DEFAULT_PREFERENCES.format);
});

test("values outside the allowlist are discarded per field", () => {
  const r = parsePreferenceRecord('{"language":"klingon","format":"bullets"}');
  assert.equal(r.source, "record");
  assert.equal(r.preferences.language, "en");
  assert.equal(r.preferences.format, "bullets");
  assert.deepEqual(r.ignored, ["language"]);
});

test("wrong types are discarded", () => {
  const r = parsePreferenceRecord('{"language":42,"answerLength":["brief"]}');
  assert.equal(r.source, "default-invalid");
  assert.deepEqual(r.ignored.sort(), ["answerLength", "language"]);
});

test("nonsense records fall back to defaults without throwing", () => {
  for (const raw of ["not json", "[]", "null", "42", '"str"', "{"]) {
    const r = parsePreferenceRecord(raw);
    assert.equal(r.source, "default-invalid", raw);
    assert.deepEqual(r.preferences, DEFAULT_PREFERENCES);
  }
});

test("oversized records are rejected", () => {
  const raw = JSON.stringify({ language: "pt", pad: "x".repeat(MAX_RECORD_CHARS) });
  assert.equal(parsePreferenceRecord(raw).source, "default-invalid");
});

test("unknown keys are counted, never carried over", () => {
  const r = parsePreferenceRecord('{"language":"pt","evil":"x","__proto__":{"a":1}}');
  assert.equal(r.preferences.language, "pt");
  assert.ok(r.unknownKeys >= 1);
  assert.ok(!("evil" in r.preferences));
});
