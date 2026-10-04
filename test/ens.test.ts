import { test } from "node:test";
import assert from "node:assert/strict";
import type { PublicClient } from "viem";
import { InvalidEnsNameError, normalizeEnsName, readPreferenceRecord } from "../src/ens.ts";
import { PREFERENCE_KEY } from "../src/preferences.ts";

test("names are ENSIP-15 normalized", () => {
  assert.equal(normalizeEnsName("  ANA.ETH "), "ana.eth");
});

test("invalid names are rejected", () => {
  for (const bad of ["", "   ", "nodots", "a..eth", "bad name.eth"]) {
    assert.throws(() => normalizeEnsName(bad), InvalidEnsNameError, bad);
  }
});

test("resolution receives the normalized name, not raw input", async () => {
  const seen: { name: string; key: string }[] = [];
  const fake = {
    getEnsText: async (args: { name: string; key: string }) => {
      seen.push(args);
      return null;
    },
  } as unknown as PublicClient;

  const result = await readPreferenceRecord("ANA.ETH", fake);
  assert.deepEqual(seen, [{ name: "ana.eth", key: PREFERENCE_KEY }]);
  assert.equal(result.raw, null);
});

test("an invalid name never reaches the resolver", async () => {
  let called = false;
  const fake = { getEnsText: async () => ((called = true), null) } as unknown as PublicClient;
  await assert.rejects(readPreferenceRecord("not a name", fake), InvalidEnsNameError);
  assert.equal(called, false);
});
