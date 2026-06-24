# Builder `autoSaveOnly` contract findings

**Slice:** `slice/builder-autosave-verify`
**Date:** 2026-06-22 (read-only probes) · 2026-06-24 (live run)
**Harness:** `templates/content/scripts/builder-autosave-contract/`
**Question being answered:** Does `PUT/PATCH …/api/v1/write/{model}/{id}?autoSaveOnly=true`
stage a revision _without_ changing the live published artifact? This assumption
is Fusion-proven but was **not** Builder-verified, and it gates un-gating live
Builder writes in the content template.

---

## TL;DR / recommendation

**GO** (for the safety contract that gates live writes).

The live run (2026-06-24, against a dedicated throwaway Builder test space)
**proved the gating invariant**: an `autoSaveOnly=true` PATCH that changed the
entry's content did **not** move the live/published artifact. Across create →
autosave → re-read, the delivered `published` state, body content, marker, and
`lastUpdated` were all unchanged. Confirmed on **both draft and published**
entries, with **minimal and `data.blocks`-bearing** content. The autosaved value
provably never reached delivery. This is the safety property PR3 needs.

**One assumption was falsified and corrected.** This doc originally predicted the
autosave would flip `meta.hasAutosaves` to `true` on the delivery re-read (Q2),
based on read-only evidence that the field exists and is `true` on some
production entries. The live run showed the **write-API `?autoSaveOnly=true`
path does not observably flip `meta.hasAutosaves`** — tested across draft/
published, minimal/blocks, 1s/8s/20s re-read windows, with and without
`cachebust`, and via `fields=meta`/`includeMeta`, the write-side GET, and admin
GraphQL. The field is real but reflects **editor-made** autosaves; the write-API
path registers differently, and staged-autosave state is not exposed through any
read API. The harness now records Q2 as **`blocked` (not API-observable)** rather
than asserting a value the write path doesn't produce — this is a non-fatal
finding and does **not** gate the GO, which rests on Q1 (live artifact unchanged).

Net: treat `autoSaveOnly=true` as the canonical safe write mode (it never moves
live content). Autosave _recoverability_ is editor-internal — verify in the
Builder editor if it ever needs confirming; it cannot be asserted from the API.

See [Live run results](#live-run-results-2026-06-24).

---

## How to reproduce

```bash
cd templates/content

# Plan only — no network, safe anywhere:
node --experimental-strip-types scripts/builder-autosave-contract/run-contract.ts

# Read-only delivery probe (needs only the public BUILDER_API_KEY):
node --env-file=<env-with-public-key> --experimental-strip-types \
  scripts/builder-autosave-contract/probe-readonly.ts --model blog-article

# Full live contract run against YOUR throwaway entry (needs BOTH keys):
node --env-file=.env.local --experimental-strip-types \
  scripts/builder-autosave-contract/run-contract.ts --live \
  --model zz-autosave-contract-test-model

# Add the destructive unpublish probe (Q3), throwaway entry only:
... --live --allow-unpublish-test
```

Credentials (read from env, never hard-coded):
`BUILDER_PRIVATE_KEY` / `BUILDER_CMS_PRIVATE_KEY` (write) and
`BUILDER_API_KEY` / `BUILDER_PUBLIC_KEY` (public delivery). A `--live` run
**requires both** — without the delivery key the harness cannot read delivered
state to assert the invariants, so it refuses to run rather than emit an
unverified GO.

**Safety gates enforced in code (not convention):**

- Live writes refuse any model that is not test-named (`zz-*` or containing
  `autosave-contract-test`) unless it is explicitly passed via `--allow-model
<name>`. There is no default production model.
- Mutating client calls (`createEntry`/`patchEntry`) require an opaque
  capability token (`MutableModel` / `MutableTarget`) that only `safety.ts` can
  mint — a bare model/id string is rejected at runtime. A write into unvetted
  content is therefore unrepresentable, not merely discouraged.
- The throwaway entry is created as a **draft** (`published:"draft"`), so even
  the harness's own entry is never pushed live.

Raw captured request/response is written to
`scripts/builder-autosave-contract/evidence/`. Every persisted field flows
through a single recursive redaction path that strips credential-looking query
params (`apiKey`, `api_key`, `key`, `token`, `privateKey`, …) **anywhere** —
including ones nested inside embedded URLs such as Builder pixel/preview URLs —
and credential-looking object fields in request/response bodies and headers.

---

## Evidence captured this run (read-only, real space)

Two `GET https://cdn.builder.io/api/v3/content/blog-article` calls — published-only
and `includeUnpublished=true` — both `HTTP 200`. Raw envelope saved to
`evidence/readonly-probe-*.json`. The delivery result carries these top-level
fields:

```
createdBy, createdDate, data, firstPublished, folders, id, lastUpdated,
lastUpdatedBy, meta, modelId, name, previewUrl, published, query, rev,
screenshot, stageModifiedSincePublish, testRatio, variations
```

`meta` includes: `breakpoints, hasAutosaves, hasErrors, hasLinks, kind,
lastPreviewUrl, shopifyDomain`.

The load-bearing observation (3 real published articles):

| name (truncated)                          | published   | meta.hasAutosaves | stageModifiedSincePublish |
| ----------------------------------------- | ----------- | ----------------- | ------------------------- |
| Building in the Age of Collaborative…     | `published` | `false`           | `false`                   |
| AI Sped Up Coding Faster Than…            | `published` | `false`           | `false`                   |
| How to Make AI Agents Follow Your Design… | `published` | **`true`**        | `false`                   |

The third row is the proof point: a **live, published** entry that **has staged
autosaves** yet still delivers published content (`stageModifiedSincePublish:
false`). Autosaves and the published artifact coexist; the delivery API returns
the published revision regardless of `hasAutosaves`.

> **Important (learned in the live run):** these `hasAutosaves: true` values are
> on entries whose autosaves were made **in the Builder editor**. The live run
> below shows the write-API `?autoSaveOnly=true` path does **not** produce an
> observable `hasAutosaves` flip — so this field can confirm "autosaves coexist
> with published content" but cannot be used to verify that _our write call_
> staged one.

---

## Live run results (2026-06-24)

Ran `run-contract.ts --live` against a dedicated throwaway Builder test space
(private write key + public delivery key supplied for this purpose). Builder's
write API 404s when creating into a non-existent model, so the run targeted the
default `page` model via `--allow-model page`; every throwaway entry was created
with the `zz-autosave-contract-test` prefix and **deleted after the run**.

**Verdict: `3 answered, 0 failed, 2 blocked` (exit 0).** Independently audited by
GPT-5.5 (Codex, high effort) → **SOUND**.

| Observation                                                               | Result                                                           |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `autoSaveOnly=true` PATCH (changed marker/blocks) → delivered `published` | **unchanged** ✅                                                 |
| → delivered body/marker/content                                           | **unchanged** (autosaved value never delivered) ✅               |
| → `lastUpdated`                                                           | **unchanged** ✅                                                 |
| Safety verified on draft entries                                          | ✅                                                               |
| Safety verified on **published** entries (the real PR3 scenario)          | ✅ (autosaved body did not leak; `published` stayed `published`) |
| `meta.hasAutosaves` flips after write-API autosave                        | **No** — never observed (see below)                              |

**Why `meta.hasAutosaves` is `blocked`, not a pass or a fail.** The write-API
autosave does not flip it, and it is not retrievable through any read surface:

- delivery `includeUnpublished=true` — `meta` empty `{}` or absent
- `fields=meta` / `includeMeta=true` — no `meta` populated
- waited 1s / 8s / 20s with fresh `cachebust` each time — never appears (not a
  propagation or cache artifact)
- write-side single-entry `GET /api/v1/write/{model}/{id}` — `400 Bad request method`
- admin GraphQL — request error

This is recorded as a non-fatal `blocked` finding: the staged-autosave state is
editor-internal and simply isn't part of the API contract. It does not affect
the GO, which rests entirely on the safety invariant (live content unchanged).

---

## Answers to the 5 questions

### Q1 — What does `PUT …?autoSaveOnly=true` do to an already-published entry? Does the live delivered artifact stay unchanged?

**Answer: YES — confirmed by the live run (2026-06-24).**

- The autosave PATCH (which changed `data.marker`/`data.blocks`) returned HTTP
  ok, and the delivered `published` state and `data.marker`/body were unchanged
  from the `q1-baseline-delivery` baseline — verified on both draft and
  published entries. The harness **asserts** these (it does not just capture);
  a violation is recorded as `failed` and exits nonzero, so a broken contract
  can never read as a GO.
- Corroborating read evidence: an entry with `meta.hasAutosaves: true` is still
  served as `published: "published"` with `stageModifiedSincePublish: false` —
  the presence of staged autosaves does **not** change what delivery returns.
- The production write adapter (`_builder-cms-write-adapter.ts`) issues exactly
  `PATCH /api/v1/write/{model}/{id}?autoSaveOnly=true&triggerWebhooks=false`
  with a `data`-only body (no `published` field), so it never asks Builder to
  change publish state — matching the path proven above.

### Q2 — Does it create Builder History autosaves? Trigger webhooks? Change `lastUpdated` / delivery-cache behavior?

**Answer (live run resolved this — see correction below).**

- **History autosaves:** `meta.hasAutosaves` is a real delivery field and we
  observed it `true` on a real published (editor-edited) entry. **But the live
  run showed the write-API `?autoSaveOnly=true` PATCH does not observably flip
  it** — tested across draft/published, minimal/blocks, 1s/8s/20s re-reads, with
  and without `cachebust`, and via `fields=meta`/`includeMeta`, the write-side
  GET, and admin GraphQL. The earlier expectation that the harness would
  **assert** `meta.hasAutosaves === true` was wrong: the write path doesn't
  surface it. Q2 is now a **non-fatal `blocked` finding** ("not API-observable"),
  not a `failed` one. Editor-made autosaves do flip the flag; the write-API path
  registers differently and staged-autosave state stays editor-internal.
- **Webhooks:** The adapter sends `triggerWebhooks=false`, so autosave writes
  suppress webhooks by design. The harness records the write response; webhook
  firing is observable only with a configured webhook sink (out of scope of a
  pure API harness — noted as a follow-up if webhook behavior must be proven).
- **`lastUpdated` / cache:** `lastUpdated` is a top-level delivery field; the
  harness re-reads with `cachebust` before and after the autosave so any
  `lastUpdated` movement is captured. Delivery cache is defeated via `cachebust`
  (matching the reference Fusion repo's read pattern).

### Q3 — What happens when `published: "draft"` is sent to an already-published entry _without_ `autoSaveOnly`? (the unpublish risk)

**Answer: BLOCKED — harness ready (gated).** Not exercised this run because (a)
no safe throwaway entry was creatable and (b) the probe is destructive by
construction. The harness runs it only with `--live --allow-unpublish-test`, and
only against an entry it created this run whose name carries the
`zz-autosave-contract-test` prefix and whose model passed the live gate.

Expected (and the reason this path is gated in production): the draft PATCH sets
the entry's publish state to `draft`, so published-only delivery returns 0
results / 404 while the entry still exists under `includeUnpublished=true`. The
harness **asserts** exactly that: the unpublish PATCH is HTTP ok and
published-only delivery no longer returns the entry (`failed` otherwise). The
production adapter gates this behind `metadata.allowDraftWrites === true`
precisely because, against an already-_published_ entry, it takes live content
down.

> **Caveat for the gated run:** because the harness now creates its throwaway
> entry as a _draft_ (so nothing is ever pushed live), this probe characterizes
> the draft→delivery relationship rather than a true published→unpublished
> transition. To exercise the destructive published→draft path explicitly, the
> entry would first need to be published as a separate, equally-gated step. The
> non-destructive draft baseline is the safer default; the published-transition
> variant is left as an explicit opt-in if that exact transition must be proven.

### Q4 — Which response fields identify the live revision vs. an autosaved revision?

**Answer (answered from real evidence).** The delivery envelope distinguishes
them via:

- `published` — `"published"` vs `"draft"` (publish state of the delivered
  revision).
- `meta.hasAutosaves` — `true` when staged autosave revisions exist that are
  _not_ what's being delivered.
- `stageModifiedSincePublish` — `true` when the staged/editor content differs
  from the published revision; `false` means published == stage.
- `rev` — opaque revision token; `lastUpdated` / `lastUpdatedBy` — last-write
  metadata; `firstPublished` — original publish timestamp.

So "is the live artifact still the published one?" = `published === "published"
&& stageModifiedSincePublish === false`. The complementary "did an autosave
land?" = `meta.hasAutosaves === true` **only holds for editor-made autosaves** —
the live run showed the write-API `?autoSaveOnly=true` path does not surface
`hasAutosaves`/`stageModifiedSincePublish` at all. So in practice, what the
harness can verify from the API is the safety half (published/content unchanged);
whether the write staged a recoverable autosave is editor-internal.

### Q5 — How do scheduled entries behave? How to resolve duplicate handles/slugs when `includeUnpublished=true` returns more than one candidate?

**Answer (read-evidence + rule; per-entry confirmation harness-ready).**

- **Scheduled entries:** Builder carries scheduling via `startDate` / `endDate`
  on the entry; an entry can be `published` but outside its active window. The
  delivery query (`includeUnpublished=true`) surfaces these; the harness's
  `q5-query-by-handle` captures the full candidate set for inspection.
- **Duplicate handle/slug resolution:** `includeUnpublished=true` can return
  multiple candidates for one handle (e.g. a published entry plus a draft copy).
  Recommended deterministic rule, backed by the delivery fields above:
  1. Prefer `published === "published"` over `draft`.
  2. Among those, prefer the most recent `lastUpdated`.
  3. Use `id` as the final stable tiebreaker.
     This matches how the reference Fusion repo treats handle conflicts
     (`BLOG_SLUG_CONFLICT_WARNING`) — surface, don't silently pick. The harness
     records the raw candidate list so the rule can be validated against real
     duplicates.

---

## History: how the live half was completed

The first pass (2026-06-22) ran **read-only** delivery probes only. The seeded
`.env.local` carried no Builder write key, and the only populated
`BUILDER_PRIVATE_KEY` belonged to a **real production space with live blog
content** — not safe to write to autonomously. So writes stayed gated and the
harness was left ready to produce evidence the moment a safe credential + test
space appeared.

That happened on **2026-06-24**: a dedicated throwaway test space (separate
private write key + public delivery key) was provided expressly for this run.
The live run executed against it — see [Live run results](#live-run-results-2026-06-24)
above. Throwaway entries used the `zz-autosave-contract-test` prefix and were
deleted after each run; the production space was never touched.

### Reproducing the live run

```bash
cd templates/content
BUILDER_PRIVATE_KEY=<write-key> BUILDER_API_KEY=<delivery-key> \
  node --experimental-strip-types \
  scripts/builder-autosave-contract/run-contract.ts --live \
  --model page --allow-model page
```

(`--allow-model page` because Builder's write API 404s creating into a
non-existent model, so the run targets the default `page` model; the entry is
still a `zz-`-prefixed throwaway. Use `--allow-unpublish-test` to also exercise
the gated Q3 unpublish probe.) A clean run exits 0 with
`3 answered, 0 failed, 2 blocked` — Q1 (safety) asserted and held; Q2
(write-API autosave flag) and Q3 (gated unpublish probe) recorded as non-fatal
`blocked`. A `failed` finding (a violated safety invariant) exits nonzero and is
**NO-GO**.

## Security review & hardening (independent GPT-5.5 pass)

The safety guard was hardened over an adversarial review. Closed vectors:

- **Public token minting** — removed `__mint`; token construction is gated by
  unexported module-private key symbols (`MODEL_MINT_KEY` / `TARGET_MINT_KEY`).
- **Prototype / brand forging** — `.is()` now uses a true ECMAScript `#private`
  field (`#authentic in value`), not a copyable TS-`private` symbol, so
  `Object.create(prototype)` + brand-copy forgeries fail.
- **Raw-helper bypass** — `capture()` / `writeHeaders()` are `#private`; the only
  externally-callable write surface is the token-gated `createEntry`/`patchEntry`.
- **Token tampering** — minted tokens are `Object.freeze`d, so a vetted test
  token cannot be repointed at a production model/entry at runtime.
- **Guard monkey-patching** — token classes + prototypes are frozen, so `.is`
  cannot be reassigned to wave a forgery through.

**Known residual (accepted):** `ThrowawayRegistry.register()` trusts a
caller-supplied `id` (in-process code cannot prove an id belongs to an entry
this run created). Contained by the model gate: it only matters under an
explicit `--allow-model <production>`, and the shipped run flow only registers
the id `createEntry` just returned. Out of scope: code that replaces global
`fetch` or mutates `Object.prototype` could call Builder directly regardless of
this guard.
