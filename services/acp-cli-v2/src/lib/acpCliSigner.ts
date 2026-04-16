import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { platform } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getBinaryPath(): string {
  const base = join(__dirname, "../../bin/acp-cli-signer");
  switch (platform()) {
    case "darwin":
      return base + "-macos";
    case "win32":
      return base + "-windows.exe";
    default:
      return base + "-linux";
  }
}

const BINARY = getBinaryPath();

// macOS Gatekeeper: strip quarantine attribute so the binary can run without approval
if (platform() === "darwin") {
  try {
    execFileSync("xattr", ["-d", "com.apple.quarantine", BINARY], {
      stdio: "ignore",
    });
  } catch {
    // Attribute may not exist — that's fine
  }
}

interface GenerateResult {
  publicKey: string;
  backend: string;
}

interface SignResult {
  signature: string;
}

interface ListResult {
  keys: string[];
}

interface InfoResult {
  backend: string;
  platform: string;
}

interface ErrorResult {
  error: string;
}

function runBinary(args: string[]): unknown {
  const output = execFileSync(BINARY, args, { encoding: "utf8" });
  return JSON.parse(output.trim());
}

/**
 * Generates a P256 key pair inside the platform keystore.
 * The private key is stored securely and never returned.
 * Returns the base64-encoded public key.
 */
export function generateKeyPair(): { publicKey: string; backend: string } {
  const res = runBinary(["generate"]) as GenerateResult | ErrorResult;
  if ("error" in res) throw new Error(`acp-cli-signer: ${res.error}`);
  return { publicKey: res.publicKey, backend: res.backend };
}

/**
 * Creates a signFn callback that delegates signing to the native binary.
 * The callback takes a Uint8Array payload and returns a base64 DER signature.
 * The private key never enters the Node.js process.
 */
export function createSignFn(
  publicKeyB64: string
): (payload: Uint8Array) => Promise<string> {
  return async (payload: Uint8Array): Promise<string> => {
    const hex = Buffer.from(payload).toString("hex");
    const res = runBinary([
      "sign",
      "--public-key",
      publicKeyB64,
      "--payload",
      hex,
    ]) as SignResult | ErrorResult;
    if ("error" in res) throw new Error(`acp-cli-signer: ${res.error}`);
    return res.signature;
  };
}

/**
 * Lists all public keys stored in the platform keystore.
 */
export function listKeys(): string[] {
  const res = runBinary(["list"]) as ListResult | ErrorResult;
  if ("error" in res) throw new Error(`acp-cli-signer: ${res.error}`);
  return res.keys;
}

/**
 * Returns info about the active keystore backend.
 */
export function signerInfo(): { backend: string; platform: string } {
  const res = runBinary(["info"]) as InfoResult | ErrorResult;
  if ("error" in res) throw new Error(`acp-cli-signer: ${res.error}`);
  return { backend: res.backend, platform: res.platform };
}
