import { readFile, writeFile, unlink, readdir, stat } from "fs/promises";
import { join, relative, extname } from "path";
import { randomUUID } from "crypto";

const LOG_PREFIX = "[shipflow-undo]";

// File extensions to capture
const SOURCE_EXTENSIONS = new Set([
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
  ".html",
]);

// Directories to skip
const IGNORE_DIRS = new Set([
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
  ".cache",
]);

// File patterns to skip
const IGNORE_PATTERNS = [/\.min\./, /\.d\.ts$/, /\.map$/];

// Limits
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB per file
const MAX_SESSION_SIZE = 50 * 1024 * 1024; // 50MB total per session
const MAX_SESSIONS = 5;

export interface UndoSession {
  id: string;
  timestamp: number;
  instruction: string;
  filePath: string | null;
  snapshots: Map<string, string | null>; // path -> content (null = didn't exist)
  totalSize: number;
}

export interface RestoreResult {
  success: boolean;
  restored: string[];
  deleted: string[];
  error?: string;
}

class UndoManager {
  private sessions: Map<string, UndoSession> = new Map();
  private sessionOrder: string[] = []; // For FIFO eviction
  private latestSessionId: string | null = null;

  /**
   * Create a new undo session
   */
  createSession(instruction: string, filePath: string | null): string {
    const id = randomUUID();
    const session: UndoSession = {
      id,
      timestamp: Date.now(),
      instruction,
      filePath,
      snapshots: new Map(),
      totalSize: 0,
    };

    this.sessions.set(id, session);
    this.sessionOrder.push(id);
    this.latestSessionId = id;

    // Evict old sessions if we exceed the limit
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
  async captureWorkspace(sessionId: string, cwd: string): Promise<void> {
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
  private async walkDirectory(
    dir: string,
    rootDir: string,
    session: UndoSession
  ): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // Directory might not be readable, skip it
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip ignored directories
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
  private async captureFile(
    filePath: string,
    rootDir: string,
    session: UndoSession
  ): Promise<void> {
    // Check extension
    const ext = extname(filePath).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(ext)) {
      return;
    }

    // Check ignore patterns
    const relativePath = relative(rootDir, filePath);
    if (IGNORE_PATTERNS.some((pattern) => pattern.test(relativePath))) {
      return;
    }

    // Check file size
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

    // Check session size limit
    if (session.totalSize + stats.size > MAX_SESSION_SIZE) {
      console.warn(`${LOG_PREFIX} Session size limit reached, stopping capture`);
      return;
    }

    // Read and store file content
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
  async restoreSession(sessionId: string): Promise<RestoreResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        restored: [],
        deleted: [],
        error: `Session not found: ${sessionId}`,
      };
    }

    console.log(`${LOG_PREFIX} Restoring session: ${sessionId}`);
    const restored: string[] = [];
    const deleted: string[] = [];
    const errors: string[] = [];

    for (const [filePath, originalContent] of session.snapshots) {
      try {
        if (originalContent === null) {
          // File didn't exist before - delete it if it exists now
          try {
            await unlink(filePath);
            deleted.push(filePath);
            console.log(`${LOG_PREFIX} Deleted: ${filePath}`);
          } catch {
            // File might not exist anymore, that's fine
          }
        } else {
          // Check if file has changed
          let currentContent: string | null = null;
          try {
            currentContent = await readFile(filePath, "utf-8");
          } catch {
            // File might have been deleted
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

    // Also check for new files created by the agent that weren't in our snapshot
    // We need to detect these by comparing with current state
    // For now, we only restore files we knew about

    // Remove the session after restore
    this.sessions.delete(sessionId);
    const idx = this.sessionOrder.indexOf(sessionId);
    if (idx !== -1) {
      this.sessionOrder.splice(idx, 1);
    }
    if (this.latestSessionId === sessionId) {
      this.latestSessionId = this.sessionOrder[this.sessionOrder.length - 1] ?? null;
    }

    console.log(
      `${LOG_PREFIX} Restore complete: ${restored.length} restored, ${deleted.length} deleted`
    );

    return {
      success: errors.length === 0,
      restored,
      deleted,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  }

  /**
   * Get the latest session ID
   */
  getLatestSessionId(): string | null {
    return this.latestSessionId;
  }

  /**
   * Get session info (without full snapshots)
   */
  getSessionInfo(sessionId: string): Omit<UndoSession, "snapshots"> | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      timestamp: session.timestamp,
      instruction: session.instruction,
      filePath: session.filePath,
      totalSize: session.totalSize,
    };
  }

  /**
   * List all sessions
   */
  listSessions(): Array<Omit<UndoSession, "snapshots">> {
    return this.sessionOrder.map((id) => {
      const session = this.sessions.get(id)!;
      return {
        id: session.id,
        timestamp: session.timestamp,
        instruction: session.instruction,
        filePath: session.filePath,
        totalSize: session.totalSize,
      };
    });
  }

  /**
   * Track a new file that was created during agent execution
   * Call this when we detect a file was created that wasn't in our initial snapshot
   */
  trackNewFile(sessionId: string, filePath: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (!session.snapshots.has(filePath)) {
      session.snapshots.set(filePath, null); // null means file didn't exist
      console.log(`${LOG_PREFIX} Tracking new file: ${filePath}`);
    }
  }
}

// Singleton instance
export const undoManager = new UndoManager();
