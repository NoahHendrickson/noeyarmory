/**
 * Parses apps/web/CHANGELOG.md (Keep a Changelog / release-please format) into
 * apps/web/public/changelog.json for the in-app changelog UI.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = join(root, "apps/web");
const changelogPath = join(webRoot, "CHANGELOG.md");
const packagePath = join(webRoot, "package.json");
const outputPath = join(webRoot, "public/changelog.json");

const VERSION_HEADER =
  /^## \[([^\]]+)\](?:\([^)]*\))?(?: \((\d{4}-\d{2}-\d{2})\))?/;
const SECTION_HEADER = /^### (.+)$/;
const LIST_ITEM = /^\* (.+)$/;

function parseChangelog(markdown) {
  const releases = [];
  let current = null;
  let currentSection = null;

  for (const line of markdown.split("\n")) {
    const versionMatch = line.match(VERSION_HEADER);
    if (versionMatch) {
      current = {
        version: versionMatch[1],
        date: versionMatch[2] ?? null,
        sections: [],
      };
      releases.push(current);
      currentSection = null;
      continue;
    }

    if (!current) continue;

    const sectionMatch = line.match(SECTION_HEADER);
    if (sectionMatch) {
      currentSection = { title: sectionMatch[1], items: [] };
      current.sections.push(currentSection);
      continue;
    }

    const itemMatch = line.match(LIST_ITEM);
    if (itemMatch && currentSection) {
      // Strip release-please commit links: "message ([abc123](url))" → "message"
      const text = itemMatch[1].replace(/\s*\(\[[^\]]+\]\([^)]+\)\)\.?$/, "").trim();
      currentSection.items.push(text);
    }
  }

  return releases.filter((release) => release.sections.some((s) => s.items.length > 0));
}

const markdown = readFileSync(changelogPath, "utf8");
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
const releases = parseChangelog(markdown);

const payload = {
  version: pkg.version,
  releases,
};

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${outputPath} (v${payload.version}, ${releases.length} releases)`);
