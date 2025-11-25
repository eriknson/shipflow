import path from "path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { StreamEvent } from "../runtime/types";
import { runCursorAgentStream, resolveCursorAgentBinary, STREAM_HEADERS } from "./cursorAgent";

export type ShipflowOverlayRequestPayload = {
  filePath: string | null;
  htmlFrame: string | null;
  stackTrace: string | null;
  instruction: string;
  model?: string;
};

export type ShipflowOverlayServerOptions = {
  cursorAgentBinary?: string;
  additionalSearchDirs?: string[];
  defaultModel?: string;
  allowInProduction?: boolean;
  timeoutMs?: number;
  logPrefix?: string;
};

const DEFAULT_MODEL = "composer-1";
// Multiple patterns to extract file paths from various stack trace formats
const STACK_TRACE_PATTERNS = [
  // Format: "in Component (path/to/file.tsx:10:5)" or "at Component (path/to/file.tsx:10:5)"
  /\b(?:in|at)\s+\S+\s*\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
  // Format: "in path/to/file.tsx" or "at path/to/file.tsx"
  /\b(?:in|at)\s+((?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gi,
  // Format: just "(path/to/file.tsx:10:5)" in parentheses
  /\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
  // Format: bare path like "app/page.tsx" without surrounding context
  /(?:^|\s)((?:\.\/)?(?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gim,
];

const normalizeFilePath = (filePath: string | null) => {
  if (!filePath) return null;
  const trimmed = filePath.trim();
  if (!trimmed) return null;

  const webpackPrefix = "webpack-internal:///";
  const filePrefix = "file://";
  let sanitized = trimmed;
  if (sanitized.startsWith(webpackPrefix)) {
    sanitized = sanitized.slice(webpackPrefix.length);
  }
  if (sanitized.startsWith(filePrefix)) {
    sanitized = sanitized.slice(filePrefix.length);
  }
  if (sanitized.startsWith("./")) {
    sanitized = sanitized.slice(2);
  }

  if (!sanitized) {
    return null;
  }

  const cwd = process.cwd();
  if (pathIsAbsoluteSafe(sanitized)) {
    const relative = relativeSafe(cwd, sanitized);
    return relative.startsWith("..") ? sanitized : relative;
  }

  return sanitized;
};

const pathIsAbsoluteSafe = (target: string) => {
  try {
    return path.isAbsolute(target);
  } catch {
    return false;
  }
};

const relativeSafe = (from: string, to: string) => {
  try {
    return path.relative(from, to);
  } catch {
    return to;
  }
};

const extractFilePathFromStackTrace = (stackTrace: string | null) => {
  if (!stackTrace) return null;

  // Try each pattern in order of specificity
  for (const pattern of STACK_TRACE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(stackTrace))) {
      const rawCandidate = match[1];
      if (typeof rawCandidate !== "string") {
        continue;
      }

      let candidate = rawCandidate.trim();
      if (!candidate) {
        continue;
      }

      // Skip node_modules paths
      if (candidate.includes("node_modules/") || candidate.includes("node_modules\\")) {
        continue;
      }

      // Skip URLs
      if (candidate.includes("://")) {
        continue;
      }

      // Clean up webpack prefixes
      if (candidate.startsWith("webpack-internal:///")) {
        candidate = candidate.slice("webpack-internal:///".length);
      }

      // Clean up relative path prefix
      if (candidate.startsWith("./")) {
        candidate = candidate.slice(2);
      }

      // Strip line/column numbers at the end (e.g., ":10:5")
      candidate = candidate.replace(/:\d+(?::\d+)?$/, "");

      if (!candidate) {
        continue;
      }

      return candidate;
    }
  }

  return null;
};

const buildPrompt = (
  filePath: string,
  htmlFrame: string | null,
  stackTrace: string | null,
  instruction: string,
) => {
  const lines: string[] = [];
  lines.push(`Open ${filePath}.`);
  lines.push("Target the element matching this HTML:");
  lines.push(htmlFrame ?? "(no HTML frame provided)");
  lines.push("");
  lines.push("and the component stack:");
  lines.push(stackTrace ?? "(no component stack provided)");
  lines.push("");
  lines.push(`User request: ${instruction}`);
  return lines.join("\n");
};

const stripNullish = <T extends Record<string, unknown>>(record: T): T =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null),
  ) as T;

const isEnabled = (options: ShipflowOverlayServerOptions): boolean => {
  if (options.allowInProduction) {
    return true;
  }
  const envFlag = process.env.SHIPFLOW_OVERLAY_ENABLED;
  if (envFlag && ["true", "1", "on", "yes"].includes(envFlag.toLowerCase())) {
    return true;
  }
  return process.env.NODE_ENV === "development";
};

export function createNextHandler(options: ShipflowOverlayServerOptions = {}) {
  const logPrefix = options.logPrefix ?? "[shipflow-overlay]";

  return async function handler(request: NextRequest) {
    if (!isEnabled(options)) {
      return NextResponse.json(
        { error: "Shipflow overlay workflow is only available in development." },
        { status: 403 },
      );
    }

    let payload: ShipflowOverlayRequestPayload;
    try {
      payload = (await request.json()) as ShipflowOverlayRequestPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const instruction = payload.instruction?.trim();
    if (!instruction) {
      return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
    }

    const directFilePath = normalizeFilePath(payload.filePath);
    const derivedFilePath =
      directFilePath ??
      (payload.filePath
        ? null
        : normalizeFilePath(extractFilePathFromStackTrace(payload.stackTrace)));
    const normalizedFilePath = derivedFilePath;

    if (!normalizedFilePath) {
      const truncatedStack = payload.stackTrace?.slice(0, 200) ?? "(none)";
      console.warn(
        `${logPrefix} Could not extract file path. filePath: ${payload.filePath ?? "(null)"}, stackTrace snippet: ${truncatedStack}`,
      );
      return NextResponse.json(
        {
          error:
            "Unable to determine target file path. Make sure you're selecting an element from your project (not from node_modules).",
        },
        { status: 400 },
      );
    }

    const prompt = buildPrompt(normalizedFilePath, payload.htmlFrame, payload.stackTrace, instruction);
    const model = payload.model?.trim() || options.defaultModel || DEFAULT_MODEL;

    try {
      const resolved = await resolveCursorAgentBinary(
        stripNullish({
          binaryPath: options.cursorAgentBinary,
          additionalSearchDirs: options.additionalSearchDirs,
          logPrefix,
        }),
      );
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          const state = { isClosed: false };

          const send = (event: StreamEvent) => {
            if (state.isClosed) {
              return;
            }
            try {
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
            } catch (error) {
              if (
                error instanceof TypeError &&
                (error.message.includes("closed") || error.message.includes("Invalid state"))
              ) {
                state.isClosed = true;
              }
            }
          };

          request.signal.addEventListener("abort", () => {
            state.isClosed = true;
            try {
              controller.close();
            } catch {
              // ignore
            }
          });

          send({ event: "status", message: "Understanding user intent" });

          try {
            await runCursorAgentStream(
              {
                binary: resolved.binary,
                model,
                prompt,
                timeoutMs: options.timeoutMs,
                logPrefix,
                env: resolved.env,
              },
              send,
            );
          } catch (error) {
            if (state.isClosed) {
              return;
            }
            console.error(`${logPrefix} Failed during Cursor CLI streaming`, error);
            send({
              event: "done",
              success: false,
              summary: "",
              exitCode: null,
              error:
                error instanceof Error
                  ? error.message
                  : "Unexpected error streaming from Cursor CLI.",
            });
          } finally {
            if (!state.isClosed) {
              try {
                controller.close();
              } catch {
                // ignore
              }
              state.isClosed = true;
            }
          }
        },
      });

      return new NextResponse(stream, {
        headers: STREAM_HEADERS,
      });
    } catch (error) {
      console.error(`${logPrefix} Failed to run cursor-agent`, error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to invoke Cursor CLI. Ensure cursor-agent is installed and available on PATH.",
        },
        { status: 500 },
      );
    }
  };
}



