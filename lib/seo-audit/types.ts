export type SeoAuditSkillId = string;

export type SeoAuditStep = {
  id: SeoAuditSkillId;
  config?: Record<string, unknown>;
};

export type SeoAuditRunRequest = {
  url: string;
  steps: SeoAuditStep[];
};

export type SeoAuditStepResult = {
  step_index: number;
  id: SeoAuditSkillId;
  ok: boolean;
  started_at_ms: number;
  finished_at_ms: number;
  output?: unknown;
  error?: string;
};

export type SeoAuditRunResponse =
  | {
      trace_id: string;
      url: string;
      steps: SeoAuditStep[];
      results: SeoAuditStepResult[];
      final: unknown;
    }
  | { trace_id: string; error: string };

export type SeoAuditSkillMeta = {
  id: SeoAuditSkillId;
  name: string;
  description: string;
  config_hint?: string;
};

export type SeoAuditSkillContext = {
  trace_id: string;
  url: string;
  fetched_at_ms?: number;
};

export type SeoAuditSkill = SeoAuditSkillMeta & {
  run: (args: {
    ctx: SeoAuditSkillContext;
    input: unknown;
    config?: Record<string, unknown>;
  }) => Promise<unknown>;
};

