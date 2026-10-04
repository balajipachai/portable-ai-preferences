// Write your preferences to an ENS name you own on Sepolia.
//   PRIVATE_KEY=0x... npm run set-record -- ana.eth '{"language":"pt","sentenceLength":"short"}'
import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { namehash } from "viem/ens";
import { normalizeEnsName } from "../src/ens.ts";
import { PREFERENCE_KEY, parsePreferenceRecord } from "../src/preferences.ts";

const [nameArg, jsonArg] = process.argv.slice(2);
const key = process.env.PRIVATE_KEY;
if (!nameArg || !jsonArg || !key) {
  console.error("Usage: PRIVATE_KEY=0x... npm run set-record -- <name.eth> '<json>'");
  process.exit(1);
}

const parsed = parsePreferenceRecord(jsonArg);
if (parsed.source !== "record" || parsed.ignored.length) {
  console.error("Refusing to write: record has no valid fields or contains invalid values.", parsed);
  process.exit(1);
}

const name = normalizeEnsName(nameArg);
const transport = http(process.env.SEPOLIA_RPC_URL || undefined);
const pub = createPublicClient({ chain: sepolia, transport });
const wallet = createWalletClient({ chain: sepolia, transport, account: privateKeyToAccount(key as Hex) });

const resolver = await pub.getEnsResolver({ name });
const hash = await wallet.writeContract({
  address: resolver,
  abi: parseAbi(["function setText(bytes32 node, string key, string value)"]),
  functionName: "setText",
  args: [namehash(name), PREFERENCE_KEY, jsonArg],
});
console.log(`Set ${PREFERENCE_KEY} on ${name}: ${hash}`);
