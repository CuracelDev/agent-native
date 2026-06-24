/**
 * Initiate a GCS resumable upload session for a recording.
 *
 * Called by the browser after recording stops (when the full blob size is
 * known). Returns a `resumableSessionUri` the browser can PUT chunks to
 * directly — no app-server hop per chunk. The session URI carries its own
 * GCS auth so no Authorization header is needed on the PUT requests.
 *
 * GCS chunk rules (enforced by the browser):
 *   - Non-final chunks: PUT Content-Range: bytes start-end/* (multiple of 256 KB)
 *   - Final chunk:      PUT Content-Range: bytes start-end/totalSize
 *   - GCS returns 308 Resume Incomplete for non-final, 200/201 for final
 *
 * Route: POST /api/uploads/:recordingId/init-resumable
 * Body: { size: number, mimeType: string, filename?: string }
 * Returns: { resumableSessionUri: string, assetId: string }
 */

import {
  createError,
  defineEventHandler,
  getRouterParam,
  readBody,
  setResponseStatus,
  type H3Event,
} from "h3";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../../../../db/index.js";
import { getEventOwnerContext } from "../../../../lib/recordings.js";
import { runWithRequestContext } from "@agent-native/core/server";
import { requestBuilderResumableSession } from "@agent-native/core/file-upload";

const ALLOWED_MIME_TYPES = new Set([
  "video/webm",
  "video/mp4",
  "video/quicktime",
]);

export default defineEventHandler(async (event: H3Event) => {
  const recordingId = getRouterParam(event, "recordingId");
  if (!recordingId) {
    throw createError({ statusCode: 400, message: "Missing recordingId" });
  }

  let ownerEmail: string;
  let orgId: string | undefined;
  try {
    const ctx = await getEventOwnerContext(event);
    ownerEmail = ctx.userEmail;
    orgId = ctx.orgId;
  } catch {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  return runWithRequestContext({ userEmail: ownerEmail, orgId }, async () => {
    const [recording] = await getDb()
      .select({ id: schema.recordings.id, status: schema.recordings.status })
      .from(schema.recordings)
      .where(
        and(
          eq(schema.recordings.id, recordingId),
          eq(schema.recordings.ownerEmail, ownerEmail),
        ),
      );

    if (!recording) {
      throw createError({ statusCode: 404, message: "Recording not found" });
    }

    const body = (await readBody(event).catch(() => null)) as {
      size?: unknown;
      mimeType?: unknown;
      filename?: unknown;
    } | null;

    const size = typeof body?.size === "number" ? body.size : NaN;
    if (!Number.isFinite(size) || size <= 0) {
      throw createError({
        statusCode: 400,
        message: "size must be a positive number",
      });
    }

    const rawMime =
      typeof body?.mimeType === "string" ? body.mimeType.trim() : "video/webm";
    const baseMime = rawMime.split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(baseMime)) {
      throw createError({ statusCode: 400, message: "Unsupported mimeType" });
    }

    const ext = baseMime.includes("mp4") || baseMime.includes("quicktime")
      ? "mp4"
      : "webm";
    const filename =
      typeof body?.filename === "string" && body.filename.trim()
        ? body.filename.trim()
        : `${recordingId}.${ext}`;

    try {
      const session = await requestBuilderResumableSession(filename, baseMime, size);
      return session;
    } catch (err) {
      console.error("[init-resumable] session request failed:", err);
      setResponseStatus(event, 502);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to create resumable upload session",
      };
    }
  });
});
