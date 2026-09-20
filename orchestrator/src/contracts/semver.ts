export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/** Parse semver string — returns null if invalid */
export function parseSemVer(version: string): SemVer | null {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/** Match patterns like 1.x, 2.0.x, 2.x */
export function matchesPattern(version: SemVer, pattern: string): boolean {
  const parts = pattern.replace(/\.x$/i, "").split(".");
  if (parts.length >= 1 && parts[0] !== "x" && Number(parts[0]) !== version.major) return false;
  if (parts.length >= 2 && parts[1] !== "x" && Number(parts[1]) !== version.minor) return false;
  if (parts.length >= 3 && parts[2] !== "x" && Number(parts[2]) !== version.patch) return false;
  return true;
}

/** Check if version satisfies a semver range (npm-style subset) */
export function satisfies(version: string, range: string): boolean {
  const v = parseSemVer(version);
  if (!v) return false;

  const trimmed = range.trim();

  if (trimmed.includes("||")) {
    return trimmed.split("||").some((part) => satisfies(version, part.trim()));
  }

  if (/^\d+\.x$/i.test(trimmed) || /^\d+\.\d+\.x$/i.test(trimmed)) {
    return matchesPattern(v, trimmed);
  }

  const comparators = trimmed.split(/\s+/).filter(Boolean);
  if (comparators.length === 0) return false;

  for (const comp of comparators) {
    const m = comp.match(/^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/);
    if (!m) continue;
    const op = m[1] ?? "=";
    const target = parseSemVer(m[2]);
    if (!target) return false;
    const cmp = compareSemVer(v, target);
    const ok =
      (op === ">=" && cmp >= 0) ||
      (op === "<=" && cmp <= 0) ||
      (op === ">" && cmp > 0) ||
      (op === "<" && cmp < 0) ||
      (op === "=" && cmp === 0);
    if (!ok) return false;
  }
  return true;
}

export function contractRefVersion(ref: string): string | null {
  const at = ref.lastIndexOf("@");
  if (at < 0) return null;
  return ref.slice(at + 1);
}

export function contractRefId(ref: string): string {
  const at = ref.lastIndexOf("@");
  const path = at >= 0 ? ref.slice(0, at) : ref;
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(slash + 1) : path;
}
