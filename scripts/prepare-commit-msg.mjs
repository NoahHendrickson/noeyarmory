/**
 * Git prepare-commit-msg hook: prepend feat:/fix:/chore:/etc. when the message
 * isn't already conventional. Everything else defaults to chore unless you prefix manually.
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

  if (
    /\b(add|adds|added|new|implement|implements|implemented|introduce|introduces|introduced|support|supports|supported|ship|ships|shipped|enable|enables|enabled|launch|launches|launched)\b/.test(
      lower,
    )
  ) {
    return "feat";
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

    if (files.every((f) => f.startsWith(".github/"))) {
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

  return "chore";
}

const type = inferType(subject, stagedFiles());
lines[0] = `${type}: ${subject}`;
writeFileSync(msgFile, lines.join("\n"));
