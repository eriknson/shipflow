import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { undoManager } from "./undoManager";

export type ShipflowUndoRequestPayload = {
  sessionId?: string;
};

export type ShipflowUndoServerOptions = {
  allowInProduction?: boolean;
  logPrefix?: string;
};

const isEnabled = (options: ShipflowUndoServerOptions): boolean => {
  if (options.allowInProduction) {
    return true;
  }
  const envFlag = process.env.SHIPFLOW_OVERLAY_ENABLED;
  if (envFlag && ["true", "1", "on", "yes"].includes(envFlag.toLowerCase())) {
    return true;
  }
  return process.env.NODE_ENV === "development";
};

export function createUndoHandler(options: ShipflowUndoServerOptions = {}) {
  const logPrefix = options.logPrefix ?? "[shipflow-undo]";

  return async function handler(request: NextRequest) {
    if (!isEnabled(options)) {
      return NextResponse.json(
        { error: "Shipflow undo is only available in development." },
        { status: 403 }
      );
    }

    let payload: ShipflowUndoRequestPayload;
    try {
      payload = (await request.json()) as ShipflowUndoRequestPayload;
    } catch {
      // If no body, use latest session
      payload = {};
    }

    const sessionId = payload.sessionId ?? undoManager.getLatestSessionId();

    if (!sessionId) {
      return NextResponse.json(
        { error: "No undo session available." },
        { status: 404 }
      );
    }

    console.log(`${logPrefix} Undo requested for session: ${sessionId}`);

    try {
      const result = await undoManager.restoreSession(sessionId);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error ?? "Failed to restore session.",
            restored: result.restored,
            deleted: result.deleted,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        restored: result.restored,
        deleted: result.deleted,
        message: `Restored ${result.restored.length} file(s), deleted ${result.deleted.length} file(s).`,
      });
    } catch (error) {
      console.error(`${logPrefix} Undo failed:`, error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unexpected error during undo.",
        },
        { status: 500 }
      );
    }
  };
}

// Re-export undoManager for advanced use cases
export { undoManager } from "./undoManager";
