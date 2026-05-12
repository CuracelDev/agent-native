import { useState } from "react";
import { useActionQuery } from "@agent-native/core/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconBrandSlack,
  IconSearch,
  IconMessage,
  IconAlertTriangle,
  IconExternalLink,
  IconRefresh,
} from "@tabler/icons-react";
import type { SentryIssue } from "./index";

// ---- Types ------------------------------------------------------------------

interface SlackMessage {
  type: string;
  user?: string;
  username?: string;
  text: string;
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  channel?: { id: string; name: string };
  permalink?: string;
}

interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: { display_name: string };
}

// ---- Helpers ----------------------------------------------------------------

function tsToDate(ts: string): string {
  const ms = parseFloat(ts) * 1000;
  const d = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function resolveUsername(
  msg: SlackMessage,
  users: Record<string, SlackUser>,
): string {
  if (msg.user && users[msg.user]) {
    const u = users[msg.user];
    return u.profile.display_name || u.real_name || u.name;
  }
  return msg.username ?? "Unknown";
}

function stripSlackFormatting(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+>/g, "@user")
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<([^>|]+)\|([^>]+)>/g, "$2")
    .replace(/<([^>]+)>/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function buildSearchQuery(issue: SentryIssue): string {
  const parts: string[] = [];
  if (issue.metadata.type) parts.push(issue.metadata.type);
  if (issue.metadata.value) {
    const trimmed = issue.metadata.value.slice(0, 60).trim();
    if (trimmed) parts.push(trimmed);
  }
  if (!parts.length) parts.push(issue.title.slice(0, 80));
  return parts.join(" ").replace(/['"]/g, "").trim();
}

// ---- Main Component ---------------------------------------------------------

interface SlackMentionsPanelProps {
  issue: SentryIssue;
}

export function SlackMentionsPanel({ issue }: SlackMentionsPanelProps) {
  const defaultQuery = buildSearchQuery(issue);
  const [query, setQuery] = useState(defaultQuery);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [editingQuery, setEditingQuery] = useState(false);

  const searchQuery = useActionQuery(
    "slack-messages",
    { mode: "search", query: activeQuery ?? "" },
    { enabled: !!activeQuery },
  );

  const rawData = searchQuery.data as {
    messages?: SlackMessage[];
    users?: Record<string, SlackUser>;
    total?: number;
    error?: string;
  } | null;

  const messages =
    rawData && "messages" in rawData ? (rawData.messages ?? []) : [];
  const users: Record<string, SlackUser> =
    rawData && "users" in rawData ? (rawData.users ?? {}) : {};
  const dataError =
    (rawData && "error" in rawData ? rawData.error : null) ??
    (searchQuery.error ? (searchQuery.error as Error).message : null);

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setActiveQuery(q);
    setEditingQuery(false);
    if (activeQuery === q) searchQuery.refetch();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  // Not yet triggered
  if (!activeQuery) {
    return (
      <div className="pt-3 border-t border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconBrandSlack className="h-4 w-4 shrink-0" />
            <span>Search Slack for mentions of this error</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs shrink-0"
            onClick={() => {
              setActiveQuery(query);
            }}
          >
            <IconSearch className="h-3.5 w-3.5" />
            Search Slack
          </Button>
        </div>
        {/* Query preview */}
        <p className="mt-1.5 text-[10px] text-muted-foreground/70 font-mono truncate">
          "{query}"
        </p>
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-border/50 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <IconBrandSlack className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">Slack mentions</span>
          {!searchQuery.isLoading && !dataError && (
            <span className="text-xs text-muted-foreground">
              ({messages.length} result{messages.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => searchQuery.refetch()}
          disabled={searchQuery.isLoading}
        >
          <IconRefresh
            className={`h-3.5 w-3.5 ${searchQuery.isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Query editor */}
      {editingQuery ? (
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-xs font-mono"
            autoFocus
          />
          <Button size="sm" className="h-7 text-xs px-3" onClick={handleSearch}>
            Search
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditingQuery(true)}
          className="text-[10px] text-muted-foreground/70 font-mono truncate hover:text-muted-foreground transition-colors text-left w-full"
        >
          "{activeQuery}" — click to edit
        </button>
      )}

      {/* Results */}
      {searchQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : dataError ? (
        <div className="flex items-start gap-2 text-xs text-muted-foreground py-2">
          <IconAlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-500" />
          <span>{dataError}</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <IconMessage className="h-4 w-4 shrink-0" />
          <span>No Slack messages found for this query</span>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-0.5">
          {messages.map((msg) => {
            const name = resolveUsername(msg, users);
            const text = stripSlackFormatting(msg.text);
            return (
              <div key={msg.ts} className="flex gap-2 group">
                <div className="h-6 w-6 rounded-full bg-muted/60 shrink-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                  {name[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {tsToDate(msg.ts)}
                    </span>
                    {msg.channel && (
                      <span className="text-[10px] text-muted-foreground">
                        #{msg.channel.name}
                      </span>
                    )}
                    {msg.reply_count ? (
                      <span className="text-[10px] text-muted-foreground">
                        {msg.reply_count} repl
                        {msg.reply_count !== 1 ? "ies" : "y"}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3 break-words">
                    {text}
                  </p>
                </div>
                {msg.permalink && (
                  <a
                    href={msg.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                  >
                    <IconExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
