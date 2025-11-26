import {
  STREAM_HEADERS
} from "./chunk-LHE54KC7.js";

// src/server/createNextHandler.ts
import { NextResponse } from "next/server";

// src/server/undoManager.ts
import { readFile, writeFile, unlink, readdir, stat } from "fs/promises";
import { join, relative, extname } from "path";
import { randomUUID } from "crypto";
var LOG_PREFIX = "[shipflow-undo]";
var SOURCE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".md",
  ".mdx",
  ".html"
]);
var IGNORE_DIRS = /* @__PURE__ */ new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".turbo",
  ".vercel",
  "coverage",
  ".nyc_output",
  "__pycache__",
  ".cache"
]);
var IGNORE_PATTERNS = [/\.min\./, /\.d\.ts$/, /\.map$/];
var MAX_FILE_SIZE = 1 * 1024 * 1024;
var MAX_SESSION_SIZE = 50 * 1024 * 1024;
var MAX_SESSIONS = 5;
var UndoManager = class {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
    this.sessionOrder = [];
    // For FIFO eviction
    this.latestSessionId = null;
  }
  /**
   * Create a new undo session
   */
  createSession(instruction, filePath) {
    const id = randomUUID();
    const session = {
      id,
      timestamp: Date.now(),
      instruction,
      filePath,
      snapshots: /* @__PURE__ */ new Map(),
      totalSize: 0
    };
    this.sessions.set(id, session);
    this.sessionOrder.push(id);
    this.latestSessionId = id;
    while (this.sessionOrder.length > MAX_SESSIONS) {
      const oldestId = this.sessionOrder.shift();
      if (oldestId) {
        this.sessions.delete(oldestId);
        console.log(`${LOG_PREFIX} Evicted old session: ${oldestId}`);
      }
    }
    console.log(`${LOG_PREFIX} Created session: ${id}`);
    return id;
  }
  /**
   * Capture the current state of all source files in the workspace
   */
  async captureWorkspace(sessionId, cwd) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    console.log(`${LOG_PREFIX} Capturing workspace: ${cwd}`);
    const startTime = Date.now();
    let fileCount = 0;
    try {
      await this.walkDirectory(cwd, cwd, session);
      fileCount = session.snapshots.size;
    } catch (error) {
      console.error(`${LOG_PREFIX} Error capturing workspace:`, error);
      throw error;
    }
    const duration = Date.now() - startTime;
    console.log(
      `${LOG_PREFIX} Captured ${fileCount} files (${(session.totalSize / 1024).toFixed(1)}KB) in ${duration}ms`
    );
  }
  /**
   * Recursively walk directory and capture files
   */
  async walkDirectory(dir, rootDir, session) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) {
          continue;
        }
        await this.walkDirectory(fullPath, rootDir, session);
      } else if (entry.isFile()) {
        await this.captureFile(fullPath, rootDir, session);
      }
    }
  }
  /**
   * Capture a single file if it matches our criteria
   */
  async captureFile(filePath, rootDir, session) {
    const ext = extname(filePath).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(ext)) {
      return;
    }
    const relativePath = relative(rootDir, filePath);
    if (IGNORE_PATTERNS.some((pattern) => pattern.test(relativePath))) {
      return;
    }
    let stats;
    try {
      stats = await stat(filePath);
    } catch {
      return;
    }
    if (stats.size > MAX_FILE_SIZE) {
      console.log(`${LOG_PREFIX} Skipping large file: ${relativePath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }
    if (session.totalSize + stats.size > MAX_SESSION_SIZE) {
      console.warn(`${LOG_PREFIX} Session size limit reached, stopping capture`);
      return;
    }
    try {
      const content = await readFile(filePath, "utf-8");
      session.snapshots.set(filePath, content);
      session.totalSize += stats.size;
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to read file: ${relativePath}`, error);
    }
  }
  /**
   * Restore workspace to the state captured in the session
   */
  async restoreSession(sessionId) {
    var _a;
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        restored: [],
        deleted: [],
        error: `Session not found: ${sessionId}`
      };
    }
    console.log(`${LOG_PREFIX} Restoring session: ${sessionId}`);
    const restored = [];
    const deleted = [];
    const errors = [];
    for (const [filePath, originalContent] of session.snapshots) {
      try {
        if (originalContent === null) {
          try {
            await unlink(filePath);
            deleted.push(filePath);
            console.log(`${LOG_PREFIX} Deleted: ${filePath}`);
          } catch {
          }
        } else {
          let currentContent = null;
          try {
            currentContent = await readFile(filePath, "utf-8");
          } catch {
          }
          if (currentContent !== originalContent) {
            await writeFile(filePath, originalContent, "utf-8");
            restored.push(filePath);
            console.log(`${LOG_PREFIX} Restored: ${filePath}`);
          }
        }
      } catch (error) {
        const msg = `Failed to restore ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(msg);
        console.error(`${LOG_PREFIX} ${msg}`);
      }
    }
    this.sessions.delete(sessionId);
    const idx = this.sessionOrder.indexOf(sessionId);
    if (idx !== -1) {
      this.sessionOrder.splice(idx, 1);
    }
    if (this.latestSessionId === sessionId) {
      this.latestSessionId = (_a = this.sessionOrder[this.sessionOrder.length - 1]) != null ? _a : null;
    }
    console.log(
      `${LOG_PREFIX} Restore complete: ${restored.length} restored, ${deleted.length} deleted`
    );
    return {
      success: errors.length === 0,
      restored,
      deleted,
      error: errors.length > 0 ? errors.join("; ") : void 0
    };
  }
  /**
   * Get the latest session ID
   */
  getLatestSessionId() {
    return this.latestSessionId;
  }
  /**
   * Get session info (without full snapshots)
   */
  getSessionInfo(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return {
      id: session.id,
      timestamp: session.timestamp,
      instruction: session.instruction,
      filePath: session.filePath,
      totalSize: session.totalSize
    };
  }
  /**
   * List all sessions
   */
  listSessions() {
    return this.sessionOrder.map((id) => {
      const session = this.sessions.get(id);
      return {
        id: session.id,
        timestamp: session.timestamp,
        instruction: session.instruction,
        filePath: session.filePath,
        totalSize: session.totalSize
      };
    });
  }
  /**
   * Track a new file that was created during agent execution
   * Call this when we detect a file was created that wasn't in our initial snapshot
   */
  trackNewFile(sessionId, filePath) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (!session.snapshots.has(filePath)) {
      session.snapshots.set(filePath, null);
      console.log(`${LOG_PREFIX} Tracking new file: ${filePath}`);
    }
  }
};
var undoManager = new UndoManager();

// src/server/createNextHandler.ts
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
    const relative2 = relativeSafe(cwd, sanitized);
    return relative2.startsWith("..") ? sanitized : relative2;
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
      const { resolveCursorAgentBinary, runCursorAgentStream } = await import("./cursorAgent-AWX72GPY.js");
      const resolved = await resolveCursorAgentBinary(
        stripNullish({
          binaryPath: options.cursorAgentBinary,
          additionalSearchDirs: options.additionalSearchDirs,
          logPrefix
        })
      );
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

// src/server/createUndoHandler.ts
import { NextResponse as NextResponse2 } from "next/server";
var isEnabled2 = (options) => {
  if (options.allowInProduction) {
    return true;
  }
  const envFlag = process.env.SHIPFLOW_OVERLAY_ENABLED;
  if (envFlag && ["true", "1", "on", "yes"].includes(envFlag.toLowerCase())) {
    return true;
  }
  return process.env.NODE_ENV === "development";
};
function createUndoHandler(options = {}) {
  var _a;
  const logPrefix = (_a = options.logPrefix) != null ? _a : "[shipflow-undo]";
  return async function handler(request) {
    var _a2, _b;
    if (!isEnabled2(options)) {
      return NextResponse2.json(
        { error: "Shipflow undo is only available in development." },
        { status: 403 }
      );
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }
    const sessionId = (_a2 = payload.sessionId) != null ? _a2 : undoManager.getLatestSessionId();
    if (!sessionId) {
      return NextResponse2.json(
        { error: "No undo session available." },
        { status: 404 }
      );
    }
    console.log(`${logPrefix} Undo requested for session: ${sessionId}`);
    try {
      const result = await undoManager.restoreSession(sessionId);
      if (!result.success) {
        return NextResponse2.json(
          {
            success: false,
            error: (_b = result.error) != null ? _b : "Failed to restore session.",
            restored: result.restored,
            deleted: result.deleted
          },
          { status: 500 }
        );
      }
      return NextResponse2.json({
        success: true,
        restored: result.restored,
        deleted: result.deleted,
        message: `Restored ${result.restored.length} file(s), deleted ${result.deleted.length} file(s).`
      });
    } catch (error) {
      console.error(`${logPrefix} Undo failed:`, error);
      return NextResponse2.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unexpected error during undo."
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
  createUndoHandler,
  withShipflowOverlay
};
//# sourceMappingURL=next.js.map