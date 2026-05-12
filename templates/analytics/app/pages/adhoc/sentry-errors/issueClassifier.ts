import type { SentryIssue } from "./index";

export type IssueClass = "actionable" | "noise" | "user-error" | "unknown";

export interface ClassificationResult {
  classification: IssueClass;
  reason: string;
}

// Patterns strongly indicating non-actionable / noise
const NOISE_TYPE_PATTERNS = [
  /^ChunkLoadError/i,
  /^ResizeObserver loop/i,
  /^Script error/i,
  /^Non-Error (promise rejection|exception)/i,
  /^UnhandledRejection.*undefined/i,
  /cancelled/i,
  /aborted/i,
];

const NOISE_VALUE_PATTERNS = [
  /load failed/i,
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /the internet connection appears to be offline/i,
  /cancelled/i,
  /aborted/i,
  /timeout/i,
];

// Patterns indicating user-caused errors (auth, validation, not-found)
const USER_ERROR_TYPE_PATTERNS = [
  /ValidationError/i,
  /ZodError/i,
  /AuthError/i,
  /UnauthorizedError/i,
  /ForbiddenError/i,
  /NotFoundError/i,
];

const USER_ERROR_VALUE_PATTERNS = [
  /401/,
  /403/,
  /404/,
  /unauthorized/i,
  /forbidden/i,
  /not found/i,
  /invalid (token|credentials|password|email)/i,
  /user.*not.*found/i,
  /permission denied/i,
  /not_allowed_token_type/i,
  /invalid_auth/i,
];

// Third-party culprit patterns — lower signal, only marks as noise when combined
const THIRD_PARTY_CULPRIT_PATTERNS = [
  /node_modules/,
  /cdn\./,
  /googleapis\.com/,
  /cloudflare/,
  /amazonaws\.com/,
];

export function classifyIssue(issue: SentryIssue): ClassificationResult {
  const type = (issue.metadata.type ?? issue.type ?? "").toLowerCase();
  const value = (issue.metadata.value ?? issue.title ?? "").toLowerCase();
  const culprit = (issue.culprit ?? "").toLowerCase();
  const title = (issue.title ?? "").toLowerCase();

  // 1. Noise: known transient / browser / network patterns
  for (const pat of NOISE_TYPE_PATTERNS) {
    if (pat.test(issue.metadata.type ?? issue.type ?? issue.title)) {
      return {
        classification: "noise",
        reason: `Error type "${issue.metadata.type ?? issue.type}" is typically non-actionable browser/network noise`,
      };
    }
  }
  for (const pat of NOISE_VALUE_PATTERNS) {
    if (pat.test(value) || pat.test(title)) {
      return {
        classification: "noise",
        reason:
          "Error message matches known transient network/browser noise patterns",
      };
    }
  }

  // 2. User error: auth, validation, expected HTTP errors
  for (const pat of USER_ERROR_TYPE_PATTERNS) {
    if (pat.test(issue.metadata.type ?? issue.type ?? "")) {
      return {
        classification: "user-error",
        reason: `Error type "${issue.metadata.type ?? issue.type}" is typically caused by invalid user input or auth`,
      };
    }
  }
  for (const pat of USER_ERROR_VALUE_PATTERNS) {
    if (pat.test(value) || pat.test(title)) {
      return {
        classification: "user-error",
        reason:
          "Error message matches expected user-caused patterns (auth, validation, not-found)",
      };
    }
  }

  // 3. Third-party culprit with no affected users → likely noise
  const isThirdParty = THIRD_PARTY_CULPRIT_PATTERNS.some((p) =>
    p.test(culprit),
  );
  if (isThirdParty && issue.userCount === 0) {
    return {
      classification: "noise",
      reason:
        "Error originates in a third-party dependency and affects no users",
    };
  }

  // 4. High user count + first-party → likely actionable
  if (issue.userCount > 5 && !isThirdParty) {
    return {
      classification: "actionable",
      reason: `Affects ${issue.userCount} users and originates in first-party code`,
    };
  }

  return {
    classification: "unknown",
    reason: "Could not determine actionability from available metadata",
  };
}

export function classificationLabel(c: IssueClass): string {
  switch (c) {
    case "actionable":
      return "Actionable";
    case "noise":
      return "Noise";
    case "user-error":
      return "User error";
    case "unknown":
      return "Unclassified";
  }
}

export function classificationColor(c: IssueClass): string {
  switch (c) {
    case "actionable":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
    case "noise":
      return "bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    case "user-error":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    case "unknown":
      return "bg-muted text-muted-foreground border-border";
  }
}
