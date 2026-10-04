# Portable AI Preferences

> Write your AI preferences down once, on an ENS name you control. Any assistant that reads the record can honour them.

Ana is dyslexic and reads Portuguese more comfortably than English. Instead of re-typing "short sentences, Portuguese" into every assistant's settings page, she stores it in text records on her ENS name. This assistant reads that record and shapes every answer to match.

## How it works

```
ENS name ──normalize (ENSIP-15)──▶ getEnsText(app.portable-ai.*) on Sepolia
        ──▶ per-field allowlist (Zod) ──▶ defaults if unset/invalid
        ──▶ app-authored system prompt (selected by validated values)
        ──▶ LLM  (question travels in a separate user message)
```

**The format.** One plain ENS text record per preference, under the `app.portable-ai.` service-key namespace (ENSIP-5 reverse-dot). Every record is optional, validated independently, and editable as a normal text record in the ENS app. No JSON to type.

| text record key | allowed values | default |
| --- | --- | --- |
| `app.portable-ai.language` | `en pt es fr de it hi ja` | `en` |
| `app.portable-ai.sentenceLength` | `short medium long` | `medium` |
| `app.portable-ai.format` | `plain bullets short-paragraphs` | `plain` |
| `app.portable-ai.readingLevel` | `simple standard technical` | `standard` |
| `app.portable-ai.answerLength` | `brief normal detailed` | `normal` |

Ana's name would carry: `language=pt`, `sentenceLength=short`, `format=short-paragraphs`, `readingLevel=simple`, `answerLength=brief`. Any other app can adopt the same keys.

### Safety by construction

- **Record text never enters a prompt.** ENS data is public and user-controlled, so it is treated as untrusted. Validated enum values only *select* among fixed, app-authored instruction strings in `src/prompt.ts`. Invalid values are dropped, and the UI reports only which known field names were ignored.
- **Instructions and user content are separate messages** (`system` vs `user`).
- **Names that are missing, unset, malformed, oversized or hostile** resolve to a named default (`DEFAULT_PREFERENCES`) instead of `null` leaking into logic.
- **The entered name is ENSIP-15 normalized** before any resolution call.
- **The model call has an explicit timeout** (`LLM_TIMEOUT_MS`, default 20 s).
- **Model, endpoint and key come from env** (`LLM_MODEL`, `LLM_BASE_URL`, `LLM_API_KEY`). Nothing secret is committed.

## Run it

```bash
npm install
cp .env.example .env   # add LLM_API_KEY (any OpenAI-compatible provider)
set -a; source .env; set +a
npm start              # http://localhost:3000
```

Set your records on Sepolia (needs a Sepolia ENS name you own and a little Sepolia ETH; one transaction):

```bash
PRIVATE_KEY=0x... npm run set-record -- ana.eth \
  language=pt sentenceLength=short format=short-paragraphs readingLevel=simple answerLength=brief
```

Or add the `app.portable-ai.*` text records by hand in the ENS app (sepolia.app.ens.domains).

## Tests and recorded cases

```bash
npm test          # offline: parsing, allowlists, normalization, prompt isolation, recorded cases
npm run cases     # live: runs the recorded cases against your model and checks length limits
```

`cases/cases.json` (values are the text-record values) pairs **one question with several preference sets** (Portuguese/simple/brief, English/technical/bullets, no record, a hostile record), each with a stated expected property: language, maximum words, maximum sentence length, and which instruction text must or must not appear.

## Layout

```
src/preferences.ts  schema, allowlists, defaults, record parsing
src/prompt.ts       app-authored instruction templates and message building
src/ens.ts          ENSIP-15 normalization + Sepolia text-record read (viem)
src/llm.ts          OpenAI-compatible call with timeout
src/assistant.ts    resolve preferences -> build messages -> answer
src/server.ts       HTTP API + static UI
public/index.html   single-page UI
cases/cases.json    recorded cases
```
