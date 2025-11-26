import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { StreamEvent } from "../runtime/types";
// Import constants, including STREAM_HEADERS
import { STREAM_HEADERS } from "../runtime/constants";
import { undoManager } from "./undoManager";

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

// Edge-runtime-compatible path utilities (no Node.js path module required)
const isAbsolutePath = (p: string): boolean => {
  // Unix absolute path
  if (p.startsWith("/")) return true;
  // Windows absolute path (e.g., C:\ or C:/)
  if (/^[A-Za-z]:[\\/]/.test(p)) return true;
  return false;
};

const normalizeSeparators = (p: string): string => p.replace(/\\/g, "/");

const getRelativePath = (from: string, to: string): string => {
  const fromParts = normalizeSeparators(from).split("/").filter(Boolean);
  const toParts = normalizeSeparators(to).split("/").filter(Boolean);

  // Find common prefix length
  let commonLength = 0;
  const minLength = Math.min(fromParts.length, toParts.length);
  for (let i = 0; i < minLength; i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++;
    } else {
      break;
    }
  }

  // Build relative path
  const upCount = fromParts.length - commonLength;
  const downParts = toParts.slice(commonLength);
  const relativeParts = [...Array(upCount).fill(".."), ...downParts];

  return relativeParts.join("/") || ".";
};

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
    return isAbsolutePath(target);
  } catch {
    return false;
  }
};

const relativeSafe = (from: string, to: string) => {
  try {
    return getRelativePath(from, to);
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

const extractComponentNames = (stackTrace: string | null): string[] => {
  if (!stackTrace) return [];
  // Match "at ComponentName (Server)" or "in ComponentName (Server)" - PascalCase components only
  const matches = stackTrace.matchAll(/\b(?:at|in)\s+([A-Z][a-zA-Z0-9]*)\s*\(Server\)/g);
  return [...matches].map((m) => m[1]).filter(Boolean);
};

const buildPrompt = (
  filePath: string | null,
  htmlFrame: string | null,
  stackTrace: string | null,
  instruction: string,
) => {
  const lines: string[] = [];

  if (filePath) {
    lines.push(`Open ${filePath}.`);
    lines.push("Target the element matching this HTML:");
    lines.push(htmlFrame ?? "(no HTML frame provided)");
    lines.push("");
    lines.push("and the component stack:");
    lines.push(stackTrace ?? "(no component stack provided)");
  } else {
    // Fallback for RSC or when file path cannot be determined
    lines.push("Find the file containing the component that renders this HTML:");
    lines.push(htmlFrame ?? "(no HTML frame provided)");
    lines.push("");
    lines.push("Component stack (use component names to locate the file):");
    lines.push(stackTrace ?? "(no component stack provided)");

    const componentNames = extractComponentNames(stackTrace);
    if (componentNames.length > 0) {
      lines.push("");
      lines.push(`Look for files defining these components: ${componentNames.join(", ")}`);
    }
  }

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
        `${logPrefix} No file path found, using fallback prompt. stackTrace snippet: ${truncatedStack}`,
      );
    }

    // buildPrompt handles null filePath with a discovery-focused fallback prompt
    const prompt = buildPrompt(normalizedFilePath, payload.htmlFrame, payload.stackTrace, instruction);
    const model = payload.model?.trim() || options.defaultModel || DEFAULT_MODEL;

    try {
      // Dynamically import the cursor agent implementation to avoid bundling Node.js dependencies
      // (child_process, fs) in the initial bundle. This helps prevent errors in Edge environments
      // where these modules are not available, even if this handler is only used in Node.js routes.
      const { resolveCursorAgentBinary, runCursorAgentStream } = await import("./cursorAgent");

      const resolved = await resolveCursorAgentBinary(
        stripNullish({
          binaryPath: options.cursorAgentBinary,
          additionalSearchDirs: options.additionalSearchDirs,
          logPrefix,
        }),
      );

      // Create undo session and capture workspace state
      const cwd = process.cwd();
      const sessionId = undoManager.createSession(instruction, normalizedFilePath);
      
      try {
        await undoManager.captureWorkspace(sessionId, cwd);
      } catch (error) {
        console.warn(`${logPrefix} Failed to capture workspace for undo:`, error);
      }

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

          // Send session ID for undo support
          send({ event: "session", sessionId });
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
