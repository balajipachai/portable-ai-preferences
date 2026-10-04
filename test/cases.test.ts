import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMessages } from "../src/prompt.ts";
import { parsePreferenceRecords } from "../src/preferences.ts";

interface Variant {
  label: string;
  record: Record<string, unknown> | null;
  expect: { promptIncludes?: string[]; promptExcludes?: string[] };
}
interface Case {
  id: string;
  question: string;
  variants: Variant[];
}

const { cases } = JSON.parse(
  readFileSync(new URL("../cases/cases.json", import.meta.url), "utf8"),
) as { cases: Case[] };

for (const c of cases) {
  test(`case ${c.id}: one question, ${c.variants.length} preference sets`, () => {
    assert.ok(c.variants.length >= 2);
    const systems = new Set<string>();

    for (const v of c.variants) {
      const [system, user] = buildMessages(parsePreferenceRecords(v.record ?? {}).preferences, c.question);
      assert.ok(system && user);
      assert.equal(user.content, c.question, v.label);
      for (const s of v.expect.promptIncludes ?? []) assert.ok(system.content.includes(s), `${v.label}: missing "${s}"`);
      for (const s of v.expect.promptExcludes ?? []) assert.ok(!system.content.includes(s), `${v.label}: leaked "${s}"`);
      systems.add(system.content);
    }
    // Different preference sets must produce different instructions.
    assert.ok(systems.size > 1);
  });
}
