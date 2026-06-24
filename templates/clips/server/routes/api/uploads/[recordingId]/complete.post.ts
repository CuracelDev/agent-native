/**
 * Complete a direct-to-GCS resumable upload.
 *
 * Called by the browser after all chunks have been successfully PUT to GCS.
 * Registers the upload with Builder.io to get the CDN URL, then finalizes
 * the recording row (status → ready, triggers transcription).
 *
 * Route: POST /api/uploads/:recordingId/complete
 * Body: {
 *   assetId: string,
 *   mimeType?: string,
 *   filename?: string,
 *   durationMs?: number,
 *   width?: number,
 *   height?: number,
 *   hasAudio?: boolean,
 *   hasCamera?: boolean,
 *   videoSizeBytes?: number
 * }
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
import { completeBuilderResumableUpload } from "@agent-native/core/file-upload";
import finalizeRecording from "../../../../../actions/finalize-recording.js";

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
      assetId?: unknown;
      mimeType?: unknown;
      filename?: unknown;
      durationMs?: unknown;
      width?: unknown;
      height?: unknown;
      hasAudio?: unknown;
      hasCamera?: unknown;
      videoSizeBytes?: unknown;
    } | null;

    if (typeof body?.assetId !== "string" || !body.assetId.trim()) {
      throw createError({ statusCode: 400, message: "Missing assetId" });
    }

    const assetId = body.assetId.trim();
    const rawMime =
      typeof body.mimeType === "string" ? body.mimeType.trim() : "video/webm";
    const baseMime = rawMime.split(";")[0].trim().toLowerCase();
    const ext = baseMime.includes("mp4") || baseMime.includes("quicktime")
      ? "mp4"
      : "webm";
    const filename =
      typeof body.filename === "string" && body.filename.trim()
        ? body.filename.trim()
        : `${recordingId}.${ext}`;

    let videoUrl: string;
    try {
      videoUrl = await completeBuilderResumableUpload(assetId, filename);
    } catch (err) {
      console.error("[complete] Builder.io complete failed:", err);
      setResponseStatus(event, 502);
      return {
        ok: false,
        error:
          err instanceof Error ? err.message : "Failed to complete upload",
      };
    }

    try {
      const result = await finalizeRecording.run({
        id: recordingId,
        videoUrl,
        videoSizeBytes:
          typeof body.videoSizeBytes === "number"
            ? body.videoSizeBytes
            : undefined,
        durationMs:
          typeof body.durationMs === "number" ? body.durationMs : undefined,
        width: typeof body.width === "number" ? body.width : undefined,
        height: typeof body.height === "number" ? body.height : undefined,
        hasAudio:
          typeof body.hasAudio === "boolean" ? body.hasAudio : undefined,
        hasCamera:
          typeof body.hasCamera === "boolean" ? body.hasCamera : undefined,
        mimeType: rawMime || undefined,
      });

      return { ok: true, finalized: true, ...result };
    } catch (err) {
      console.error("[complete] finalize-recording failed:", err);
      setResponseStatus(event, 500);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Finalize failed",
      };
    }
  });
});
