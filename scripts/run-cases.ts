// Live check: sends each recorded case to the configured model and verifies
// the measurable expectations (word count, sentence length). Needs LLM_API_KEY.
import { readFileSync } from "node:fs";
import { chat } from "../src/llm.ts";
import { buildMessages } from "../src/prompt.ts";
import { parsePreferenceRecords } from "../src/preferences.ts";

interface Variant {
  label: string;
  record: Record<string, unknown> | null;
  expect: { maxWords?: number; maxWordsPerSentence?: number };
}
const { cases } = JSON.parse(
  readFileSync(new URL("../cases/cases.json", import.meta.url), "utf8"),
) as { cases: { id: string; question: string; variants: Variant[] }[] };

let failures = 0;
for (const c of cases) {
  for (const v of c.variants) {
    const out = await chat(buildMessages(parsePreferenceRecords(v.record ?? {}).preferences, c.question));
    const words = out.split(/\s+/).filter(Boolean).length;
    const longest = Math.max(
      0,
      ...out.split(/[.!?。]+/).map((s) => s.split(/\s+/).filter(Boolean).length),
    );
    const problems: string[] = [];
    if (v.expect.maxWords && words > v.expect.maxWords) problems.push(`${words} words > ${v.expect.maxWords}`);
    if (v.expect.maxWordsPerSentence && longest > v.expect.maxWordsPerSentence) {
      problems.push(`longest sentence ${longest} > ${v.expect.maxWordsPerSentence}`);
    }
    console.log(`${problems.length ? "FAIL" : "ok  "} ${c.id} / ${v.label}${problems.length ? ` — ${problems.join("; ")}` : ""}`);
    failures += problems.length ? 1 : 0;
  }
}
process.exit(failures ? 1 : 0);
