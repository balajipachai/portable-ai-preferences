// Write your preferences to an ENS name you own on Sepolia, in one transaction.
//   PRIVATE_KEY=0x... npm run set-record -- ana.eth language=pt sentenceLength=short format=short-paragraphs
import { createPublicClient, createWalletClient, encodeFunctionData, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
import { normalizeEnsName } from "../src/ens.ts";
import { PREFERENCE_NAMES, parsePreferenceRecords, recordKey, type PreferenceName, type RawRecords } from "../src/preferences.ts";

const [nameArg, ...pairs] = process.argv.slice(2);
const key = process.env.PRIVATE_KEY;
if (!nameArg || pairs.length === 0 || !key) {
  console.error("Usage: PRIVATE_KEY=0x... npm run set-record -- <name.eth> language=pt [field=value ...]");
  console.error(`Fields: ${PREFERENCE_NAMES.join(", ")}`);
  process.exit(1);
}

const raw: RawRecords = {};
for (const pair of pairs) {
  const [field, value = ""] = pair.split("=");
  if (!PREFERENCE_NAMES.includes(field as PreferenceName)) {
    console.error(`Unknown field "${field}".`);
    process.exit(1);
  }
  raw[field as PreferenceName] = value;
}
const parsed = parsePreferenceRecords(raw);
if (parsed.ignored.length || parsed.source !== "record") {
  console.error(`Refusing to write: invalid value for ${parsed.ignored.join(", ") || "all fields"}.`);
  process.exit(1);
}

const name = normalizeEnsName(nameArg);
const transport = http(process.env.SEPOLIA_RPC_URL || undefined);
const pub = createPublicClient({ chain: sepolia, transport });
const wallet = createWalletClient({ chain: sepolia, transport, account: privateKeyToAccount(key as Hex) });

const abi = parseAbi([
  "function setText(bytes32 node, string key, string value)",
  "function multicall(bytes[] data) returns (bytes[] results)",
]);
const node = namehash(name);
const calls = (Object.entries(raw) as [PreferenceName, string][]).map(([field, value]) =>
  encodeFunctionData({ abi, functionName: "setText", args: [node, recordKey(field), value] }),
);
const resolver = await pub.getEnsResolver({ name });
const hash = await wallet.writeContract({ address: resolver, abi, functionName: "multicall", args: [calls] });
console.log(`Set ${calls.length} records on ${name}: ${hash}`);
