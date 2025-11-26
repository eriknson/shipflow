"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/cursorAgent.ts
var cursorAgent_exports = {};
__export(cursorAgent_exports, {
  STREAM_HEADERS: () => STREAM_HEADERS2,
  resolveCursorAgentBinary: () => resolveCursorAgentBinary,
  runCursorAgentStream: () => runCursorAgentStream
});
async function discoverCursorAgentBinary(options) {
  var _a3, _b2;
  const additionalSearchDirs = (_a3 = options.additionalSearchDirs) != null ? _a3 : [];
  const logPrefix = (_b2 = options.logPrefix) != null ? _b2 : LOG_PREFIX2;
  const candidateNames = /* @__PURE__ */ new Set();
  if (options.binaryPath) {
    candidateNames.add(options.binaryPath);
  }
  if (CURSOR_BINARY_HINT) {
    candidateNames.add(CURSOR_BINARY_HINT);
  }
  candidateNames.add("cursor-agent");
  if (process.platform === "win32") {
    candidateNames.add("cursor-agent.exe");
  }
  for (const name of candidateNames) {
    if (!name) continue;
    if (import_path2.default.isAbsolute(name)) {
      if (await pathExistsAndExecutable(name)) {
        return {
          binary: name,
          env: null
        };
      }
      continue;
    }
    const whichCommand = process.platform === "win32" ? "where" : "which";
    const lookup = (0, import_child_process.spawnSync)(whichCommand, [name], { encoding: "utf8" });
    if (!lookup.error && lookup.status === 0 && lookup.stdout) {
      const resolvedPath = lookup.stdout.split(/\r?\n/).find(Boolean);
      if (resolvedPath && await pathExistsAndExecutable(resolvedPath)) {
        return {
          binary: resolvedPath,
          env: null
        };
      }
    }
    for (const dir of buildCandidateDirs(name, additionalSearchDirs)) {
      const fullPath = import_path2.default.join(dir, name);
      if (await pathExistsAndExecutable(fullPath)) {
        return {
          binary: fullPath,
          env: null
        };
      }
    }
  }
  console.error(
    `${logPrefix} cursor-agent binary not found. Set CURSOR_AGENT_BIN to an absolute path or add cursor-agent to your PATH.`
  );
  throw new Error(
    "cursor-agent binary not found. Set CURSOR_AGENT_BIN to an absolute path or add cursor-agent to your PATH."
  );
}
async function resolveCursorAgentBinary(options = {}) {
  if (options.binaryPath) {
    const normalized = options.binaryPath.trim();
    if (normalized && await pathExistsAndExecutable(normalized)) {
      return {
        binary: normalized,
        env: null
      };
    }
  }
  if (cachedBinary) {
    return {
      binary: cachedBinary,
      env: cachedEnv
    };
  }
  if (!resolvePromise) {
    resolvePromise = discoverCursorAgentBinary(options).then((resolved) => {
      var _a3, _b2;
      cachedBinary = resolved.binary;
      const extraDirs = [
        ...(_a3 = options.additionalSearchDirs) != null ? _a3 : [],
        import_path2.default.dirname(resolved.binary)
      ];
      if (HOME_DIR) {
        extraDirs.push(import_path2.default.join(HOME_DIR, ".cursor", "bin"));
        extraDirs.push(import_path2.default.join(HOME_DIR, "Library", "Application Support", "Cursor", "bin"));
        extraDirs.push(import_path2.default.join(HOME_DIR, "AppData", "Local", "Programs", "cursor", "bin"));
      }
      const existingPath = (_b2 = process.env.PATH) != null ? _b2 : "";
      const pathSegments = new Set(
        existingPath.split(import_path2.default.delimiter).map((segment) => segment.trim()).filter(Boolean)
      );
      for (const dir of extraDirs) {
        if (dir) {
          pathSegments.add(dir);
        }
      }
      cachedEnv = {
        ...process.env,
        PATH: Array.from(pathSegments).join(import_path2.default.delimiter)
      };
      return {
        binary: resolved.binary,
        env: cachedEnv
      };
    }).catch((error) => {
      resolvePromise = null;
      throw error;
    });
  }
  return resolvePromise;
}
async function runCursorAgentStream(options, send) {
  var _a3;
  const logPrefix = (_a3 = options.logPrefix) != null ? _a3 : LOG_PREFIX2;
  await new Promise((resolve) => {
    var _a4, _b2;
    try {
      const args = [
        "--print",
        "--force",
        "--output-format",
        "stream-json",
        "--stream-partial-output",
        "--model",
        options.model,
        options.prompt
      ];
      console.log(`${logPrefix} Spawning cursor-agent`, {
        command: options.binary,
        args,
        cwd: process.cwd()
      });
      const child = (0, import_child_process.spawn)(options.binary, args, {
        cwd: process.cwd(),
        env: (_a4 = options.env) != null ? _a4 : process.env,
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdoutBuffer = "";
      let stderrAggregate = "";
      let assistantSummary = "";
      let settled = false;
      const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : Number((_b2 = process.env.SHIPFLOW_OVERLAY_AGENT_TIMEOUT_MS) != null ? _b2 : 4 * 60 * 1e3);
      const sendStatus = (message) => {
        if (!message) return;
        send({ event: "status", message });
      };
      const appendAssistant = (text) => {
        if (!text) return;
        assistantSummary += text;
        send({ event: "assistant", text });
      };
      const flushDone = (success, exitCode, error) => {
        send({
          event: "done",
          success,
          summary: assistantSummary.trim(),
          exitCode,
          error,
          stderr: stderrAggregate.trim() || void 0
        });
      };
      const processLine = (line) => {
        if (!line.trim()) {
          return;
        }
        try {
          const parsed = JSON.parse(line);
          if (typeof parsed.type === "string" && parsed.type === "error") {
            const errorMessage = typeof parsed.message === "string" ? parsed.message : typeof parsed.error === "string" ? parsed.error : "Cursor CLI reported an error.";
            if (errorMessage.toLowerCase().includes("cannot use this model") || errorMessage.toLowerCase().includes("available models")) {
              if (!settled) {
                settled = true;
                clearTimeout(timeoutId);
                flushDone(false, null, errorMessage);
                resolve();
                return;
              }
            }
            sendStatus(`Error: ${errorMessage}`);
          }
          const status = describeEvent(parsed);
          if (status) {
            const trimmed = status.trim();
            const isWhitelisted = WHITELISTED_STATUS_MESSAGES.has(trimmed);
            const isIgnored = IGNORED_STATUS_MESSAGES.has(trimmed);
            const isLongEnough = trimmed.length >= MIN_STATUS_LENGTH;
            if (!isIgnored && (isWhitelisted || isLongEnough)) {
              sendStatus(trimmed);
            }
          }
          if (typeof parsed.type === "string" && parsed.type === "assistant") {
            const text = extractAssistantText(parsed);
            appendAssistant(text);
          }
          if (typeof parsed.type === "string" && parsed.type === "result") {
            const text = extractAssistantText(parsed);
            appendAssistant(text);
          }
        } catch (error) {
          console.warn(`${logPrefix} Failed to parse cursor-agent stream line`, {
            line,
            error
          });
          sendStatus(line);
        }
      };
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn(`${logPrefix} cursor-agent exceeded timeout; terminating process`, {
          timeoutMs
        });
        sendStatus(`Cursor CLI timed out after ${timeoutMs}ms; terminating process.`);
        try {
          child.kill("SIGTERM");
        } catch (killError) {
          console.warn(`${logPrefix} Failed to terminate cursor-agent process`, killError);
        }
        flushDone(false, null, `Cursor CLI timed out after ${timeoutMs}ms.`);
        resolve();
      }, timeoutMs);
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdoutBuffer += text;
        let newlineIndex = stdoutBuffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = stdoutBuffer.slice(0, newlineIndex);
          stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
          processLine(line);
          newlineIndex = stdoutBuffer.indexOf("\n");
        }
      });
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderrAggregate += text;
        const lowerText = text.toLowerCase();
        if ((lowerText.includes("cannot use this model") || lowerText.includes("available models")) && !settled) {
          settled = true;
          clearTimeout(timeoutId);
          const errorMessage = text.trim();
          flushDone(false, null, errorMessage);
          resolve();
          return;
        }
        for (const line of text.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
          sendStatus(`[stderr] ${line}`);
        }
        console.error(`${logPrefix} cursor-agent stderr:`, text);
      });
      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        console.error(`${logPrefix} cursor-agent failed to start`, error);
        flushDone(false, null, error instanceof Error ? error.message : "Failed to start Cursor CLI.");
        resolve();
      });
      child.on("close", (exitCode) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (stdoutBuffer.trim()) {
          processLine(stdoutBuffer);
          stdoutBuffer = "";
        }
        console.log(`${logPrefix} cursor-agent exited`, { exitCode });
        if (exitCode === 0) {
          flushDone(true, exitCode != null ? exitCode : 0);
        } else {
          const error = stderrAggregate.trim() || `Cursor CLI exited with status ${exitCode != null ? exitCode : "unknown"}. Check server logs for details.`;
          flushDone(false, exitCode != null ? exitCode : null, error);
        }
        resolve();
      });
    } catch (error) {
      console.error(`${logPrefix} Unexpected error launching cursor-agent`, error);
      send({
        event: "done",
        success: false,
        summary: "",
        exitCode: null,
        error: error instanceof Error ? error.message : "Unexpected error launching Cursor CLI."
      });
      resolve();
    }
  });
}
var import_child_process, import_promises2, import_fs, import_path2, LOG_PREFIX2, _a, CURSOR_BINARY_HINT, _a2, _b, HOME_DIR, cachedBinary, cachedEnv, resolvePromise, IGNORED_STATUS_MESSAGES, WHITELISTED_STATUS_MESSAGES, MIN_STATUS_LENGTH, STATUS_KEYS, STREAM_HEADERS2, pathExistsAndExecutable, describeEvent, extractAssistantText, buildCandidateDirs;
var init_cursorAgent = __esm({
  "src/server/cursorAgent.ts"() {
    "use strict";
    import_child_process = require("child_process");
    import_promises2 = require("fs/promises");
    import_fs = require("fs");
    import_path2 = __toESM(require("path"), 1);
    LOG_PREFIX2 = "[shipflow-overlay]";
    CURSOR_BINARY_HINT = (_a = process.env.CURSOR_AGENT_BIN) != null ? _a : "cursor-agent";
    HOME_DIR = (_b = (_a2 = process.env.HOME) != null ? _a2 : process.env.USERPROFILE) != null ? _b : "";
    cachedBinary = null;
    cachedEnv = null;
    resolvePromise = null;
    IGNORED_STATUS_MESSAGES = /* @__PURE__ */ new Set(["User event"]);
    WHITELISTED_STATUS_MESSAGES = /* @__PURE__ */ new Set([
      "Initializing agent",
      "Agent ready.",
      "Thinking",
      "Building changes",
      "Analyzing project",
      "Build step complete."
    ]);
    MIN_STATUS_LENGTH = 30;
    STATUS_KEYS = ["text", "value", "delta", "message", "summary", "label"];
    STREAM_HEADERS2 = {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform"
    };
    pathExistsAndExecutable = async (filePath) => {
      if (!filePath) return false;
      try {
        await (0, import_promises2.access)(filePath, import_fs.constants.X_OK);
        return true;
      } catch {
        try {
          await (0, import_promises2.access)(filePath, import_fs.constants.F_OK);
          return true;
        } catch {
          return false;
        }
      }
    };
    describeEvent = (event) => {
      if (!event || typeof event !== "object") {
        return null;
      }
      const payload = event;
      const type = typeof payload.type === "string" ? payload.type : null;
      const subtype = typeof payload.subtype === "string" ? payload.subtype : null;
      if (type === "system") {
        if (subtype === "init") {
          return "Initializing agent";
        }
        if (subtype === "progress" && typeof payload.message === "string") {
          return payload.message;
        }
        if (subtype === "completed") {
          return "Agent ready.";
        }
        return subtype ? `System update: ${subtype}` : "System update.";
      }
      if (type === "assistant") {
        return "Thinking\u2026";
      }
      if (type === "tool_call") {
        const toolName = typeof payload.tool === "object" && payload.tool && typeof payload.tool.name === "string" ? String(payload.tool.name) : "Tool";
        const normalizedName = toolName.toLowerCase();
        if (subtype === "started") {
          if (normalizedName.includes("apply") || normalizedName.includes("write") || normalizedName.includes("patch") || normalizedName.includes("build")) {
            return "Building changes\u2026";
          }
          if (normalizedName.includes("plan") || normalizedName.includes("analy")) {
            return "Analyzing project\u2026";
          }
          return `Running ${toolName}\u2026`;
        }
        if (subtype === "completed") {
          if (normalizedName.includes("apply") || normalizedName.includes("write") || normalizedName.includes("patch") || normalizedName.includes("build")) {
            return "Build step complete.";
          }
          return `${toolName} finished.`;
        }
        return `${toolName} ${subtype != null ? subtype : "update"}\u2026`;
      }
      if (type === "result") {
        return "Finalizing changes\u2026";
      }
      if (type === "error") {
        if (typeof payload.message === "string") {
          return `Error: ${payload.message}`;
        }
        return "Cursor CLI reported an error.";
      }
      if (typeof payload.message === "string") {
        return payload.message;
      }
      return type ? `Event: ${type}${subtype ? `/${subtype}` : ""}` : null;
    };
    extractAssistantText = (input, seen = /* @__PURE__ */ new WeakSet()) => {
      if (!input) return "";
      if (typeof input === "string") {
        return input;
      }
      if (Array.isArray(input)) {
        return input.map((entry) => extractAssistantText(entry, seen)).join("");
      }
      if (typeof input === "object") {
        if (seen.has(input)) return "";
        seen.add(input);
        const record = input;
        let text = "";
        for (const key of STATUS_KEYS) {
          const value = record[key];
          if (typeof value === "string") {
            text += value;
          } else if (value) {
            text += extractAssistantText(value, seen);
          }
        }
        if ("content" in record) {
          text += extractAssistantText(record.content, seen);
        }
        if ("parts" in record) {
          text += extractAssistantText(record.parts, seen);
        }
        if ("text_delta" in record) {
          text += extractAssistantText(record.text_delta, seen);
        }
        return text;
      }
      return "";
    };
    buildCandidateDirs = (binaryPath, additionalSearchDirs) => {
      var _a3;
      const candidateDirs = new Set(
        ((_a3 = process.env.PATH) != null ? _a3 : "").split(import_path2.default.delimiter).map((entry) => entry.trim()).filter(Boolean)
      );
      for (const dir of additionalSearchDirs) {
        if (dir) {
          candidateDirs.add(dir);
        }
      }
      if (HOME_DIR) {
        candidateDirs.add(import_path2.default.join(HOME_DIR, ".cursor", "bin"));
        candidateDirs.add(import_path2.default.join(HOME_DIR, "Library", "Application Support", "Cursor", "bin"));
        candidateDirs.add(import_path2.default.join(HOME_DIR, "AppData", "Local", "Programs", "cursor", "bin"));
      }
      if (binaryPath && import_path2.default.isAbsolute(binaryPath)) {
        candidateDirs.add(import_path2.default.dirname(binaryPath));
      }
      return Array.from(candidateDirs);
    };
  }
});

// src/next.ts
var next_exports = {};
__export(next_exports, {
  createNextHandler: () => createNextHandler,
  createUndoHandler: () => createUndoHandler,
  withShipflowOverlay: () => withShipflowOverlay
});
module.exports = __toCommonJS(next_exports);

// src/server/createNextHandler.ts
var import_server = require("next/server");

// src/runtime/constants.ts
var STREAM_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform"
};

// src/server/undoManager.ts
var import_promises = require("fs/promises");
var import_path = require("path");
var import_crypto = require("crypto");
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
    const id = (0, import_crypto.randomUUID)();
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
      entries = await (0, import_promises.readdir)(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = (0, import_path.join)(dir, entry.name);
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
    const ext = (0, import_path.extname)(filePath).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(ext)) {
      return;
    }
    const relativePath = (0, import_path.relative)(rootDir, filePath);
    if (IGNORE_PATTERNS.some((pattern) => pattern.test(relativePath))) {
      return;
    }
    let stats;
    try {
      stats = await (0, import_promises.stat)(filePath);
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
      const content = await (0, import_promises.readFile)(filePath, "utf-8");
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
    var _a3;
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
            await (0, import_promises.unlink)(filePath);
            deleted.push(filePath);
            console.log(`${LOG_PREFIX} Deleted: ${filePath}`);
          } catch {
          }
        } else {
          let currentContent = null;
          try {
            currentContent = await (0, import_promises.readFile)(filePath, "utf-8");
          } catch {
          }
          if (currentContent !== originalContent) {
            await (0, import_promises.writeFile)(filePath, originalContent, "utf-8");
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
      this.latestSessionId = (_a3 = this.sessionOrder[this.sessionOrder.length - 1]) != null ? _a3 : null;
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
  var _a3;
  const logPrefix = (_a3 = options.logPrefix) != null ? _a3 : "[shipflow-overlay]";
  return async function handler(request) {
    var _a4, _b2, _c, _d;
    if (!isEnabled(options)) {
      return import_server.NextResponse.json(
        { error: "Shipflow overlay workflow is only available in development." },
        { status: 403 }
      );
    }
    let payload;
    try {
      payload = await request.json();
    } catch {
      return import_server.NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    const instruction = (_a4 = payload.instruction) == null ? void 0 : _a4.trim();
    if (!instruction) {
      return import_server.NextResponse.json({ error: "Instruction is required." }, { status: 400 });
    }
    const directFilePath = normalizeFilePath(payload.filePath);
    const derivedFilePath = directFilePath != null ? directFilePath : payload.filePath ? null : normalizeFilePath(extractFilePathFromStackTrace(payload.stackTrace));
    const normalizedFilePath = derivedFilePath;
    if (!normalizedFilePath) {
      const truncatedStack = (_c = (_b2 = payload.stackTrace) == null ? void 0 : _b2.slice(0, 200)) != null ? _c : "(none)";
      console.warn(
        `${logPrefix} No file path found, using fallback prompt. stackTrace snippet: ${truncatedStack}`
      );
    }
    const prompt = buildPrompt(normalizedFilePath, payload.htmlFrame, payload.stackTrace, instruction);
    const model = ((_d = payload.model) == null ? void 0 : _d.trim()) || options.defaultModel || DEFAULT_MODEL;
    try {
      const { resolveCursorAgentBinary: resolveCursorAgentBinary2, runCursorAgentStream: runCursorAgentStream2 } = await Promise.resolve().then(() => (init_cursorAgent(), cursorAgent_exports));
      const resolved = await resolveCursorAgentBinary2(
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
            await runCursorAgentStream2(
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
      return new import_server.NextResponse(stream, {
        headers: STREAM_HEADERS
      });
    } catch (error) {
      console.error(`${logPrefix} Failed to run cursor-agent`, error);
      return import_server.NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to invoke Cursor CLI. Ensure cursor-agent is installed and available on PATH."
        },
        { status: 500 }
      );
    }
  };
}

// src/server/createUndoHandler.ts
var import_server2 = require("next/server");
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
  var _a3;
  const logPrefix = (_a3 = options.logPrefix) != null ? _a3 : "[shipflow-undo]";
  return async function handler(request) {
    var _a4, _b2;
    if (!isEnabled2(options)) {
      return import_server2.NextResponse.json(
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
    const sessionId = (_a4 = payload.sessionId) != null ? _a4 : undoManager.getLatestSessionId();
    if (!sessionId) {
      return import_server2.NextResponse.json(
        { error: "No undo session available." },
        { status: 404 }
      );
    }
    console.log(`${logPrefix} Undo requested for session: ${sessionId}`);
    try {
      const result = await undoManager.restoreSession(sessionId);
      if (!result.success) {
        return import_server2.NextResponse.json(
          {
            success: false,
            error: (_b2 = result.error) != null ? _b2 : "Failed to restore session.",
            restored: result.restored,
            deleted: result.deleted
          },
          { status: 500 }
        );
      }
      return import_server2.NextResponse.json({
        success: true,
        restored: result.restored,
        deleted: result.deleted,
        message: `Restored ${result.restored.length} file(s), deleted ${result.deleted.length} file(s).`
      });
    } catch (error) {
      console.error(`${logPrefix} Undo failed:`, error);
      return import_server2.NextResponse.json(
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createNextHandler,
  createUndoHandler,
  withShipflowOverlay
});
//# sourceMappingURL=next.cjs.map