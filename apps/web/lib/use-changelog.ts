"use client";

import { useEffect, useState } from "react";

export type ChangelogSection = {
  title: string;
  items: string[];
};

export type ChangelogRelease = {
  version: string;
  date: string | null;
  sections: ChangelogSection[];
};

export type ChangelogData = {
  version: string;
  releases: ChangelogRelease[];
};

const SEEN_VERSION_KEY = "noeyarmory-changelog-seen";

export function getSeenChangelogVersion(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SEEN_VERSION_KEY);
}

export function markChangelogSeen(version: string): void {
  localStorage.setItem(SEEN_VERSION_KEY, version);
}

export function hasUnseenChangelog(data: ChangelogData | null): boolean {
  if (!data) return false;
  return getSeenChangelogVersion() !== data.version;
}

export function useChangelog() {
  const [data, setData] = useState<ChangelogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/changelog.json");
        if (!response.ok) throw new Error("not found");
        const json = (await response.json()) as ChangelogData;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
