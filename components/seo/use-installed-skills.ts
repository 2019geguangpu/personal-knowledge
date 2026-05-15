"use client";

import { useCallback, useEffect, useState } from "react";

export type InstalledSkillRow = {
  id: string;
  dir: string;
  manifest?: Record<string, unknown>;
};

type ListResp = { skills?: InstalledSkillRow[] };

export function manifestDisplayName(m?: Record<string, unknown>): string | undefined {
  const n = m?.name;
  return typeof n === "string" && n.trim() ? n.trim() : undefined;
}

export function useInstalledSkills() {
  const [skills, setSkills] = useState<InstalledSkillRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/skills", { method: "GET", cache: "no-store" });
      const data = (await r.json()) as ListResp & { error?: string };
      if (!r.ok) {
        setError(typeof data.error === "string" ? data.error : `HTTP ${r.status}`);
        setSkills([]);
        return;
      }
      setSkills(Array.isArray(data.skills) ? data.skills : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setSkills([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { skills, busy, error, reload };
}
