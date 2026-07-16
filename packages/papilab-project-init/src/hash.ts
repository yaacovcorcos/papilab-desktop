import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export function sha256(contents: string | Uint8Array): string {
  return createHash("sha256").update(contents).digest("hex");
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}
