import {
  STREAM_HEADERS
} from "./chunk-LHE54KC7.js";

// src/server/createNextHandler.ts
import { NextResponse } from "next/server";
var DEFAULT_MODEL = "composer-1";
var isAbsolutePath = (p) => {
  if (p.startsWith("/")) return true;
  if (/^[A-Za-z]:[\\/]/.test(p)) return true;
  return false;
};
var normalizeSeparators = (p) => p.replace(/\\/g, "/");
var getRelativePath = (from, to) => {
  const fromParts = normalizeSeparators(from).split("/").filter(Boolean);
  const toParts = normalizeSeparators(to).split("/").filter(Boolean);
  let commonLength = 0;
  const minLength = Math.min(fromParts.length, toParts.length);
  for (let i = 0; i < minLength; i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++;
    } else {
      break;
    }
  }
  const upCount = fromParts.length - commonLength;
  const downParts = toParts.slice(commonLength);
  const relativeParts = [...Array(upCount).fill(".."), ...downParts];
  return relativeParts.join("/") || ".";
};
var STACK_TRACE_PATTERNS = [
  // Format: "in Component (path/to/file.tsx:10:5)" or "at Component (path/to/file.tsx:10:5)"
  /\b(?:in|at)\s+\S+\s*\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
  // Format: "in path/to/file.tsx" or "at path/to/file.tsx"
  /\b(?:in|at)\s+((?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gi,
  // Format: just "(path/to/file.tsx:10:5)" in parentheses
  /\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
  // Format: bare path like "app/page.tsx" without surrounding context
  /(?:^|\s)((?:\.\/)?(?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gim
];
var normalizeFilePath = (filePath) => {
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
var pathIsAbsoluteSafe = (target) => {
  try {
    return isAbsolutePath(target);
  } catch {
    return false;
  }
};
var relativeSafe = (from, to) => {
  try {
    return getRelativePath(from, to);
  } catch {
    return to;
  }
};
var extractFilePathFromStackTrace = (stackTrace) => {
  if (!stackTrace) return null;
  for (const pattern of STACK_TRACE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while (match = pattern.exec(stackTrace)) {
      const rawCandidate = match[1];
      if (typeof rawCandidate !== "string") {
        continue;
      }
      let candidate = rawCandidate.trim();
      if (!candidate) {
        continue;
      }
      if (candidate.includes("node_modules/") || candidate.includes("node_modules\\")) {
        continue;
      }
      if (candidate.includes("://")) {
        continue;
      }
      if (candidate.startsWith("webpack-internal:///")) {
        candidate = candidate.slice("webpack-internal:///".length);
      }
      if (candidate.startsWith("./")) {
        candidate = candidate.slice(2);
      }
      candidate = candidate.replace(/:\d+(?::\d+)?$/, "");
      if (!candidate) {
        continue;
      }
      return candidate;
    }
  }
  return null;
};
var extractComponentNames = (stackTrace) => {
  if (!stackTrace) return [];
  const matches = stackTrace.matchAll(/\b(?:at|in)\s+([A-Z][a-zA-Z0-9]*)\s*\(Server\)/g);
  return [...matches].map((m) => m[1]).filter(Boolean);
};
var buildPrompt = (filePath, htmlFrame, stackTrace, instruction) => {
  const lines = [];
  if (filePath) {
    lines.push(`Open ${filePath}.`);
    lines.push("Target the element matching this HTML:");
    lines.push(htmlFrame != null ? htmlFrame : "(no HTML frame provided)");
    lines.push("");
    lines.push("and the component stack:");
    lines.push(stackTrace != null ? stackTrace : "(no component stack provided)");
  } else {
    lines.push("Find the file containing the component that renders this HTML:");
    lines.push(htmlFrame != null ? htmlFrame : "(no HTML frame provided)");
    lines.push("");
    lines.push("Component stack (use component names to locate the file):");
    lines.push(stackTrace != null ? stackTrace : "(no component stack provided)");
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
var stripNullish = (record) => Object.fromEntries(
  Object.entries(record).filter(([, value]) => value !== void 0 && value !== null)
);
var isEnabled = (options) => {
  if (options.allowInProduction) {
    return true;
  }
  const envFlag = process.env.SHIPFLOW_OVERLAY_ENABLED;
  if (envFlag && ["true", "1", "on", "yes"].includes(envFlag.toLowerCase())) {
    return true;
  }
  return process.env.NODE_ENV === "development";
};
function createNextHandler(options = {}) {
  var _a;
  const logPrefix = (_a = options.logPrefix) != null ? _a : "[shipflow-overlay]";
  return async function handler(request) {
    var _a2, _b, _c, _d;
    if (!isEnabled(options)) {
      return NextResponse.json(
        { error: "Shipflow overlay workflow is only available in development." },
        { status: 403 }
      );
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    const instruction = (_a2 = payload.instruction) == null ? void 0 : _a2.trim();
    if (!instruction) {
      return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
    }
    const directFilePath = normalizeFilePath(payload.filePath);
    const derivedFilePath = directFilePath != null ? directFilePath : payload.filePath ? null : normalizeFilePath(extractFilePathFromStackTrace(payload.stackTrace));
    const normalizedFilePath = derivedFilePath;
    if (!normalizedFilePath) {
      const truncatedStack = (_c = (_b = payload.stackTrace) == null ? void 0 : _b.slice(0, 200)) != null ? _c : "(none)";
      console.warn(
        `${logPrefix} No file path found, using fallback prompt. stackTrace snippet: ${truncatedStack}`
      );
    }
    const prompt = buildPrompt(normalizedFilePath, payload.htmlFrame, payload.stackTrace, instruction);
    const model = ((_d = payload.model) == null ? void 0 : _d.trim()) || options.defaultModel || DEFAULT_MODEL;
    try {
      const { resolveCursorAgentBinary, runCursorAgentStream } = await import("./cursorAgent-3DUS67C6.js");
      const resolved = await resolveCursorAgentBinary(
        stripNullish({
          binaryPath: options.cursorAgentBinary,
          additionalSearchDirs: options.additionalSearchDirs,
          logPrefix
        })
      );
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const state = { isClosed: false };
          const send = (event) => {
            if (state.isClosed) {
              return;
            }
            try {
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}
`));
            } catch (error) {
              if (error instanceof TypeError && (error.message.includes("closed") || error.message.includes("Invalid state"))) {
                state.isClosed = true;
              }
            }
          };
          request.signal.addEventListener("abort", () => {
            state.isClosed = true;
            try {
              controller.close();
            } catch {
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
                env: resolved.env
              },
              send
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
              error: error instanceof Error ? error.message : "Unexpected error streaming from Cursor CLI."
            });
          } finally {
            if (!state.isClosed) {
              try {
                controller.close();
              } catch {
              }
              state.isClosed = true;
            }
          }
        }
      });
      return new NextResponse(stream, {
        headers: STREAM_HEADERS
      });
    } catch (error) {
      console.error(`${logPrefix} Failed to run cursor-agent`, error);
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to invoke Cursor CLI. Ensure cursor-agent is installed and available on PATH."
        },
        { status: 500 }
      );
    }
  };
}

// src/next.ts
function withShipflowOverlay(config = {}, options = {}) {
  const enabled = options.enableInProduction || process.env.NODE_ENV === "development";
  const env = {
    ...config.env,
    SHIPFLOW_OVERLAY_ENABLED: enabled ? "true" : "false"
  };
  if (options.reactGrabUrl) {
    env.SHIPFLOW_OVERLAY_REACT_GRAB_URL = options.reactGrabUrl;
  }
  if (options.logClipboardEndpoint) {
    env.SHIPFLOW_OVERLAY_LOG_ENDPOINT = options.logClipboardEndpoint;
  }
  const existingTranspile = Array.isArray(config.transpilePackages) ? config.transpilePackages : [];
  const transpilePackages = Array.from(
    /* @__PURE__ */ new Set([...existingTranspile, "@shipflow/overlay"])
  );
  return {
    ...config,
    env,
    transpilePackages
  };
}
export {
  createNextHandler,
  withShipflowOverlay
};
//# sourceMappingURL=next.js.map