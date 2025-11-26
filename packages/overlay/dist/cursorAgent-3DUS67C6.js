// src/server/cursorAgent.ts
import { spawn, spawnSync } from "child_process";
import { access } from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";
var LOG_PREFIX = "[shipflow-overlay]";
var _a;
var CURSOR_BINARY_HINT = (_a = process.env.CURSOR_AGENT_BIN) != null ? _a : "cursor-agent";
var _a2, _b;
var HOME_DIR = (_b = (_a2 = process.env.HOME) != null ? _a2 : process.env.USERPROFILE) != null ? _b : "";
var cachedBinary = null;
var cachedEnv = null;
var resolvePromise = null;
var IGNORED_STATUS_MESSAGES = /* @__PURE__ */ new Set(["User event"]);
var WHITELISTED_STATUS_MESSAGES = /* @__PURE__ */ new Set([
  "Initializing agent",
  "Agent ready.",
  "Thinking",
  "Building changes",
  "Analyzing project",
  "Build step complete."
]);
var MIN_STATUS_LENGTH = 30;
var STATUS_KEYS = ["text", "value", "delta", "message", "summary", "label"];
var STREAM_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform"
};
var pathExistsAndExecutable = async (filePath) => {
  if (!filePath) return false;
  try {
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    try {
      await access(filePath, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
};
var describeEvent = (event) => {
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
var extractAssistantText = (input, seen = /* @__PURE__ */ new WeakSet()) => {
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
var buildCandidateDirs = (binaryPath, additionalSearchDirs) => {
  var _a3;
  const candidateDirs = new Set(
    ((_a3 = process.env.PATH) != null ? _a3 : "").split(path.delimiter).map((entry) => entry.trim()).filter(Boolean)
  );
  for (const dir of additionalSearchDirs) {
    if (dir) {
      candidateDirs.add(dir);
    }
  }
  if (HOME_DIR) {
    candidateDirs.add(path.join(HOME_DIR, ".cursor", "bin"));
    candidateDirs.add(path.join(HOME_DIR, "Library", "Application Support", "Cursor", "bin"));
    candidateDirs.add(path.join(HOME_DIR, "AppData", "Local", "Programs", "cursor", "bin"));
  }
  if (binaryPath && path.isAbsolute(binaryPath)) {
    candidateDirs.add(path.dirname(binaryPath));
  }
  return Array.from(candidateDirs);
};
async function discoverCursorAgentBinary(options) {
  var _a3, _b2;
  const additionalSearchDirs = (_a3 = options.additionalSearchDirs) != null ? _a3 : [];
  const logPrefix = (_b2 = options.logPrefix) != null ? _b2 : LOG_PREFIX;
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
    if (path.isAbsolute(name)) {
      if (await pathExistsAndExecutable(name)) {
        return {
          binary: name,
          env: null
        };
      }
      continue;
    }
    const whichCommand = process.platform === "win32" ? "where" : "which";
    const lookup = spawnSync(whichCommand, [name], { encoding: "utf8" });
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
      const fullPath = path.join(dir, name);
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
        path.dirname(resolved.binary)
      ];
      if (HOME_DIR) {
        extraDirs.push(path.join(HOME_DIR, ".cursor", "bin"));
        extraDirs.push(path.join(HOME_DIR, "Library", "Application Support", "Cursor", "bin"));
        extraDirs.push(path.join(HOME_DIR, "AppData", "Local", "Programs", "cursor", "bin"));
      }
      const existingPath = (_b2 = process.env.PATH) != null ? _b2 : "";
      const pathSegments = new Set(
        existingPath.split(path.delimiter).map((segment) => segment.trim()).filter(Boolean)
      );
      for (const dir of extraDirs) {
        if (dir) {
          pathSegments.add(dir);
        }
      }
      cachedEnv = {
        ...process.env,
        PATH: Array.from(pathSegments).join(path.delimiter)
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
  const logPrefix = (_a3 = options.logPrefix) != null ? _a3 : LOG_PREFIX;
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
      const child = spawn(options.binary, args, {
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
export {
  STREAM_HEADERS,
  resolveCursorAgentBinary,
  runCursorAgentStream
};
//# sourceMappingURL=cursorAgent-3DUS67C6.js.map