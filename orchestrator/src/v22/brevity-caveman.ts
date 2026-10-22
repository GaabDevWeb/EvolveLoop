/**
 * V22-GOAL-009 — opt-in Caveman-style brevity (voice only; preserves contracts verbatim).
 */

import { isCavemanBrevityEnabled } from "./feature-flags.js";
import { estimateWhitespaceTokens } from "./token-estimate.js";

const FENCE_RE = /```[\s\S]*?```/g;
const VERBATIM_LINE_MARKERS = [
  /"apiVersion"\s*:/,
  /"kind"\s*:\s*"Evidence"/,
  /EVIDENCE_SECRET_CANARY/,
  /Definition of Done/i,
  /HMAC-SHA256/,
];

export interface BrevityResult {
  enabled: boolean;
  text: string;
  input_tokens: number;
  output_tokens: number;
  preserved_blocks: number;
}

function cavemanLine(line: string): string {
  const t = line.trim();
  if (!t) return "";
  if (t.startsWith("#")) return t;
  let candidate = t;
  if (t.startsWith("-") || t.startsWith("*") || /^\d+\./.test(t)) {
    candidate = t
      .replace(/\b(please|kindly|basically|actually|however|therefore)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  } else {
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length > 6) {
      candidate = words.slice(0, Math.max(4, Math.ceil(words.length * 0.55))).join(" ");
    }
  }
  const clauses = t.match(/\b(?:do not|never|não|nunca|not)\s+[^.!?\n]+/gi) ?? [];
  for (const clause of clauses) {
    const c = clause.trim();
    if (!candidate.toLowerCase().includes(c.toLowerCase())) {
      candidate = `${candidate} ${c}`.replace(/\s+/g, " ").trim();
    }
  }
  return candidate;
}

export function applyCavemanBrevity(text: string, options?: { force?: boolean }): BrevityResult {
  const enabled = options?.force === true || isCavemanBrevityEnabled();
  const input_tokens = estimateWhitespaceTokens(text);
  if (!enabled) {
    return { enabled: false, text, input_tokens, output_tokens: input_tokens, preserved_blocks: 0 };
  }

  const blocks: string[] = [];
  let preserved_blocks = 0;
  const stripped = text.replace(FENCE_RE, (block) => {
    blocks.push(block);
    preserved_blocks += 1;
    return `\u0000BLOCK${blocks.length - 1}\u0000`;
  });

  const lines = stripped.split("\n");
  const outLines = lines.map((line) => {
    if (line.includes("\u0000BLOCK")) return line;
    if (VERBATIM_LINE_MARKERS.some((re) => re.test(line))) return line;
    if (/^`[^`]+`/.test(line.trim())) return line;
    return cavemanLine(line);
  });

  let joined = outLines.join("\n");
  for (let i = 0; i < blocks.length; i++) {
    joined = joined.replace(`\u0000BLOCK${i}\u0000`, blocks[i]);
  }

  const output_tokens = estimateWhitespaceTokens(joined);
  return { enabled: true, text: joined, input_tokens, output_tokens, preserved_blocks };
}

function compressBriefingProse(briefing: string): string {
  const clauses = briefing.match(/\b(?:do not|never|não|nunca|not)\s+[^.!?\n]+/gi) ?? [];
  let t = briefing
    .replace(/\b(please|carefully|kindly|basically|actually|however|therefore|thoroughly|detailed)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  for (const clause of clauses) {
    const c = clause.trim();
    if (!t.toLowerCase().includes(c.toLowerCase())) {
      t = `${t} ${c}`.replace(/\s+/g, " ").trim();
    }
  }
  return t;
}

/** Compress only the briefing section of a pickup prompt; headers/DoD/inputs stay intact. */
export function applyCavemanToBriefingSection(fullPrompt: string): BrevityResult {
  const marker = "## Briefing\n\n";
  const endMarker = "\n\n## Definition of Done";
  const start = fullPrompt.indexOf(marker);
  if (start === -1) {
    return applyCavemanBrevity(fullPrompt);
  }
  const bodyStart = start + marker.length;
  const end = fullPrompt.indexOf(endMarker, bodyStart);
  if (end === -1) {
    return applyCavemanBrevity(fullPrompt);
  }
  const head = fullPrompt.slice(0, bodyStart);
  const briefing = fullPrompt.slice(bodyStart, end);
  const tail = fullPrompt.slice(end);
  const enabled = isCavemanBrevityEnabled();
  const compressedBriefing = enabled ? compressBriefingProse(briefing) : briefing;
  const text = head + compressedBriefing + tail;
  return {
    enabled,
    text,
    input_tokens: estimateWhitespaceTokens(fullPrompt),
    output_tokens: estimateWhitespaceTokens(text),
    preserved_blocks: 0,
  };
}

export function brevityPreservesNegation(original: string, compressed: string, needles: string[]): boolean {
  return needles.every((n) => (original.includes(n) ? compressed.includes(n) : true));
}
