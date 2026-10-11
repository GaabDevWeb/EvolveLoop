import { randomBytes } from "node:crypto";

const KEY_ENV = "EVOLVELOOP_CHECKPOINT_HMAC_KEY";

if (!process.env[KEY_ENV]?.trim()) {
  process.env[KEY_ENV] = randomBytes(32).toString("base64");
}
