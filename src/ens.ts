import { createPublicClient, http, type PublicClient } from "viem";
import { sepolia } from "viem/chains";
import { normalize } from "viem/ens";
import { PREFERENCE_KEY } from "./preferences.ts";

export class InvalidEnsNameError extends Error {
  constructor(message = "That is not a valid ENS name.") {
    super(message);
    this.name = "InvalidEnsNameError";
  }
}

/** ENSIP-15 normalization. Must run before any resolution call. */
export function normalizeEnsName(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "" || trimmed.length > 255 || !trimmed.includes(".")) {
    throw new InvalidEnsNameError();
  }
  try {
    return normalize(trimmed);
  } catch {
    throw new InvalidEnsNameError();
  }
}

let client: PublicClient | undefined;
function defaultClient(): PublicClient {
  client ??= createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL || undefined),
  }) as PublicClient;
  return client;
}

export interface RecordRead {
  ensName: string; // normalized
  raw: string | null; // null when the name or record is unset
}

/** Read the preferences text record. Normalizes the name first. */
export async function readPreferenceRecord(
  input: string,
  rpc: PublicClient = defaultClient(),
): Promise<RecordRead> {
  const ensName = normalizeEnsName(input);
  const raw = await rpc.getEnsText({ name: ensName, key: PREFERENCE_KEY });
  return { ensName, raw };
}
