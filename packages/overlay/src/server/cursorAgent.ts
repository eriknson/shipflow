import { spawn, spawnSync } from "child_process";
import { access } from "fs/promises";
import { constants as fsConstants } from "fs";
import path from "path";

import type { StreamEvent } from "../runtime/types";

const LOG_PREFIX = "[shipflow-overlay]";
const CURSOR_BINARY_HINT = process.env.CURSOR_AGENT_BIN ?? "cursor-agent";
const HOME_DIR = process.env.HOME ?? process.env.USERPROFILE ?? "";

type ResolveOptions = {
  binaryPath?: string;
  additionalSearchDirs?: string[];
  logPrefix?: string;
};

type ResolvedBinary = {
  binary: string;
  env: NodeJS.ProcessEnv | null;
};

type RunOptions = {
  binary: string;
  model: string;
  prompt: string;
  timeoutMs?: number;
  logPrefix?: string;
  env?: NodeJS.ProcessEnv | null;
};

let cachedBinary: string | null = null;
let cachedEnv: NodeJS.ProcessEnv | null = null;
let resolvePromise: Promise<ResolvedBinary> | null = null;

const IGNORED_STATUS_MESSAGES = new Set(["User event"]);

const WHITELISTED_STATUS_MESSAGES = new Set([
  "Initializing agent",
  "Agent ready.",
  "Thinking",
  "Building changes",
  "Analyzing project",
  "Build step complete.",
]);

const MIN_STATUS_LENGTH = 30;
const STATUS_KEYS = ["text", "value", "delta", "message", "summary", "label"];

const STREAM_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
};

export { STREAM_HEADERS };

const pathExistsAndExecutable = async (filePath: string) => {
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

const describeEvent = (event: unknown): string | null => {
  if (!event || typeof event !== "object") {
    return null;
  }

  const payload = event as Record<string, unknown>;
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
    return "Thinking…";
  }

  if (type === "tool_call") {
    const toolName =
      typeof payload.tool === "object" &&
      payload.tool &&
      typeof (payload.tool as Record<string, unknown>).name === "string"
        ? String((payload.tool as Record<string, unknown>).name)
        : "Tool";
    const normalizedName = toolName.toLowerCase();

    if (subtype === "started") {
      if (
        normalizedName.includes("apply") ||
        normalizedName.includes("write") ||
        normalizedName.includes("patch") ||
        normalizedName.includes("build")
      ) {
        return "Building changes…";
      }
      if (normalizedName.includes("plan") || normalizedName.includes("analy")) {
        return "Analyzing project…";
      }
      return `Running ${toolName}…`;
    }
    if (subtype === "completed") {
      if (
        normalizedName.includes("apply") ||
        normalizedName.includes("write") ||
        normalizedName.includes("patch") ||
        normalizedName.includes("build")
      ) {
        return "Build step complete.";
      }
      return `${toolName} finished.`;
    }
    return `${toolName} ${subtype ?? "update"}…`;
  }

  if (type === "result") {
    return "Finalizing changes…";
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

const extractAssistantText = (input: unknown, seen = new WeakSet<object>()): string => {
  if (!input) return "";
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((entry) => extractAssistantText(entry, seen)).join("");
  }
  if (typeof input === "object") {
    if (seen.has(input as object)) return "";
    seen.add(input as object);

    const record = input as Record<string, unknown>;
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

const buildCandidateDirs = (binaryPath: string | undefined, additionalSearchDirs: string[]) => {
  const candidateDirs = new Set<string>(
    (process.env.PATH ?? "")
      .split(path.delimiter)
      .map((entry) => entry.trim())
      .filter(Boolean),
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

async function discoverCursorAgentBinary(options: ResolveOptions): Promise<ResolvedBinary> {
  const additionalSearchDirs = options.additionalSearchDirs ?? [];
  const logPrefix = options.logPrefix ?? LOG_PREFIX;

  const candidateNames = new Set<string>();
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
          env: null,
        };
      }
      continue;
    }

    const whichCommand = process.platform === "win32" ? "where" : "which";
    const lookup = spawnSync(whichCommand, [name], { encoding: "utf8" });
    if (!lookup.error && lookup.status === 0 && lookup.stdout) {
      const resolvedPath = lookup.stdout.split(/\r?\n/).find(Boolean);
      if (resolvedPath && (await pathExistsAndExecutable(resolvedPath))) {
        return {
          binary: resolvedPath,
          env: null,
        };
      }
    }

    for (const dir of buildCandidateDirs(name, additionalSearchDirs)) {
      const fullPath = path.join(dir, name);
      if (await pathExistsAndExecutable(fullPath)) {
        return {
          binary: fullPath,
          env: null,
        };
      }
    }
  }

  console.error(
    `${logPrefix} cursor-agent binary not found. Set CURSOR_AGENT_BIN to an absolute path or add cursor-agent to your PATH.`,
  );
  throw new Error(
    "cursor-agent binary not found. Set CURSOR_AGENT_BIN to an absolute path or add cursor-agent to your PATH.",
  );
}

export async function resolveCursorAgentBinary(
  options: ResolveOptions = {},
): Promise<ResolvedBinary> {
  if (options.binaryPath) {
    const normalized = options.binaryPath.trim();
    if (normalized && (await pathExistsAndExecutable(normalized))) {
      return {
        binary: normalized,
        env: null,
      };
    }
  }

  if (cachedBinary) {
    return {
      binary: cachedBinary,
      env: cachedEnv,
    };
  }

  if (!resolvePromise) {
    resolvePromise = discoverCursorAgentBinary(options)
      .then((resolved) => {
        cachedBinary = resolved.binary;
        const extraDirs: string[] = [
          ...(options.additionalSearchDirs ?? []),
          path.dirname(resolved.binary),
        ];
        if (HOME_DIR) {
          extraDirs.push(path.join(HOME_DIR, ".cursor", "bin"));
          extraDirs.push(path.join(HOME_DIR, "Library", "Application Support", "Cursor", "bin"));
          extraDirs.push(path.join(HOME_DIR, "AppData", "Local", "Programs", "cursor", "bin"));
        }

        const existingPath = process.env.PATH ?? "";
        const pathSegments = new Set<string>(
          existingPath
            .split(path.delimiter)
            .map((segment) => segment.trim())
            .filter(Boolean),
        );

        for (const dir of extraDirs) {
          if (dir) {
            pathSegments.add(dir);
          }
        }

        cachedEnv = {
          ...process.env,
          PATH: Array.from(pathSegments).join(path.delimiter),
        };

        return {
          binary: resolved.binary,
          env: cachedEnv,
        };
      })
      .catch((error) => {
        resolvePromise = null;
        throw error;
      });
  }

  return resolvePromise;
}

export async function runCursorAgentStream(
  options: RunOptions,
  send: (event: StreamEvent) => void,
) {
  const logPrefix = options.logPrefix ?? LOG_PREFIX;
  await new Promise<void>((resolve) => {
    try {
      const args = [
        "--print",
        "--force",
        "--output-format",
        "stream-json",
        "--stream-partial-output",
        "--model",
        options.model,
        options.prompt,
      ];

      console.log(`${logPrefix} Spawning cursor-agent`, {
        command: options.binary,
        args,
        cwd: process.cwd(),
      });

      const child = spawn(options.binary, args, {
        cwd: process.cwd(),
        env: options.env ?? process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdoutBuffer = "";
      let stderrAggregate = "";
      let assistantSummary = "";
      let settled = false;

      const timeoutMs =
        typeof options.timeoutMs === "number"
          ? options.timeoutMs
          : Number(process.env.SHIPFLOW_OVERLAY_AGENT_TIMEOUT_MS ?? 4 * 60 * 1000);

      const sendStatus = (message: string) => {
        if (!message) return;
        send({ event: "status", message });
      };

      const appendAssistant = (text: string) => {
        if (!text) return;
        assistantSummary += text;
        send({ event: "assistant", text });
      };

      const flushDone = (success: boolean, exitCode: number | null, error?: string) => {
        send({
          event: "done",
          success,
          summary: assistantSummary.trim(),
          exitCode,
          error,
          stderr: stderrAggregate.trim() || undefined,
        });
      };

      const processLine = (line: string) => {
        if (!line.trim()) {
          return;
        }

        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
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
            error,
          });
          sendStatus(line);
        }
      };

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;

        console.warn(`${logPrefix} cursor-agent exceeded timeout; terminating process`, {
          timeoutMs,
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
        for (const line of text.split(/\r?\n/).map((entry: string) => entry.trim()).filter(Boolean)) {
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
          flushDone(true, exitCode ?? 0);
        } else {
          const error =
            stderrAggregate.trim() ||
            `Cursor CLI exited with status ${exitCode ?? "unknown"}. Check server logs for details.`;
          flushDone(false, exitCode ?? null, error);
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
        error: error instanceof Error ? error.message : "Unexpected error launching Cursor CLI.",
      });
      resolve();
    }
  });
}



