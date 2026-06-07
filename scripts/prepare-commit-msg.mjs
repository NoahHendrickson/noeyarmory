/**
 * Git prepare-commit-msg hook: prepend feat:/fix:/etc. when the message
 * isn't already conventional. Infers type from the subject and staged files.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [msgFile, source] = process.argv.slice(2);

if (!msgFile) {
  process.exit(0);
}

// Leave merge/squash commits and editor templates alone.
if (source === "merge" || source === "squash" || source === "template") {
  process.exit(0);
}

const raw = readFileSync(msgFile, "utf8");
const lines = raw.split("\n");
const subject = lines[0]?.trim() ?? "";

if (!subject) {
  process.exit(0);
}

const CONVENTIONAL =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9\-_, ]+\))?!?: .+/i;

if (CONVENTIONAL.test(subject)) {
  process.exit(0);
}

// release-please and similar automation
if (/^chore(\([^)]+\))?!: release/i.test(subject)) {
  process.exit(0);
}

function stagedFiles() {
  try {
    return execFileSync("git", ["diff", "--cached", "--name-only"], {
      encoding: "utf8",
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function inferType(message, files) {
  const lower = message.toLowerCase();

  if (
    /\b(fix|fixed|fixes|bug|bugs|broken|regression|patch|hotfix|correct|corrects|corrected|resolve[ds]?|crash|crashes|error|typo)\b/.test(
      lower,
    )
  ) {
    return "fix";
  }

  if (files.length > 0) {
    if (files.every((f) => f.endsWith(".md") || f.startsWith("docs/"))) {
      return "docs";
    }

    if (
      files.every(
        (f) =>
          /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) ||
          f.includes("__tests__") ||
          f.includes("/tests/"),
      )
    ) {
      return "test";
    }

    if (
      files.every(
        (f) =>
          f.startsWith(".github/") ||
          f === "release-please-config.json" ||
          f === ".release-please-manifest.json",
      )
    ) {
      return "ci";
    }

    if (
      files.every(
        (f) =>
          f.endsWith("pnpm-lock.yaml") ||
          f.endsWith("package-lock.json") ||
          (/package\.json$/.test(f) && !f.includes("apps/") && !f.includes("packages/")),
      )
    ) {
      return "chore";
    }
  }

  if (/\b(refactor|rename|reorganize|restructure|cleanup|clean up|extract|move)\b/.test(lower)) {
    return "refactor";
  }

  if (/\b(perf|performance|faster|speed|optimize|optimise|cache)\b/.test(lower)) {
    return "perf";
  }

  // User-facing code changes default to feat so they show in the changelog.
  return "feat";
}

const type = inferType(subject, stagedFiles());
lines[0] = `${type}: ${subject}`;
writeFileSync(msgFile, lines.join("\n"));
