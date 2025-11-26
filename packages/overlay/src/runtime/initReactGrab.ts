import type { SelectionPayload, Rect } from "./types";

// Guard flag to prevent double initialization
const INIT_FLAG = "__shipflowReactGrabInitialized";
const HIGHLIGHT_ATTR = "data-react-grab-chat-highlighted";
const SELECTION_ID_ATTR = "data-sf-selection-id";
const STYLE_ID = "shipflow-overlay-highlight-style";
const EVENT_OPEN = "react-grab-chat:open";
const EVENT_CLOSE = "react-grab-chat:close";

// Counter for unique selection IDs
let selectionIdCounter = 0;
const generateSelectionId = () => `sel-${++selectionIdCounter}-${Date.now()}`;

// Type for the React Grab API (imported dynamically)
type ReactGrabAPI = {
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  isActive: () => boolean;
  dispose: () => void;
  copyElement: (elements: Element | Element[]) => Promise<boolean>;
  getState: () => unknown;
  updateTheme: (theme: unknown) => void;
  getTheme: () => unknown;
};

export type InitReactGrabOptions = {
  projectRoot?: string;
  highlightColor?: string;
  highlightStyleId?: string;
};

type ClipboardParseResult = {
  htmlFrame: string | null;
  codeLocation: string | null;
};

// Store API instance and cleanup functions
let apiInstance: ReactGrabAPI | null = null;
let originalWriteText: ((text: string) => Promise<void>) | null = null;

const defaultOptions = {
  highlightColor: "#ff40e0",
  highlightStyleId: STYLE_ID,
};

// --- Utility functions ---

function ensureHighlightStyles(color: string, styleId: string) {
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
[${HIGHLIGHT_ATTR}="true"] {
  outline: 2px solid ${color};
  outline-offset: 2px;
  transition: outline 0.2s ease;
}

/* Loading state: hide default outline, shimmer overlay will be added separately */
[${HIGHLIGHT_ATTR}="true"][data-react-grab-loading="true"] {
  outline: none;
}

/* Shimmer overlay element - positioned over the selected element */
[data-sf-shimmer-overlay="true"] {
  position: fixed;
  pointer-events: none;
  z-index: 2147483645;
  overflow: hidden;
  border-radius: 4px;
}

[data-sf-shimmer-overlay="true"]::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.04) 25%,
    rgba(0, 0, 0, 0.08) 50%,
    rgba(0, 0, 0, 0.04) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: sf-shimmer 2s linear infinite;
}

[data-sf-shimmer-overlay="true"]::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.02);
  animation: sf-pulse 1.5s ease-in-out infinite;
}

@keyframes sf-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes sf-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}`;
  document.head.appendChild(style);
}

function parseClipboard(text: string): ClipboardParseResult {
  if (typeof text !== "string") {
    return { htmlFrame: null, codeLocation: null };
  }
  const htmlFrameMatch = text.match(/## HTML Frame:\n([\s\S]*?)(?=\n## Code Location:|$)/);
  const codeLocationMatch = text.match(/## Code Location:\n([\s\S]*?)(?=\n<\/selected_element>|$)/);
  const selectedElementMatch = text.match(/<selected_element>\n([\s\S]*?)\n<\/selected_element>/);
  const htmlFrame = htmlFrameMatch
    ? htmlFrameMatch[1].trim()
    : selectedElementMatch
      ? selectedElementMatch[1].trim()
      : null;
  const codeLocation = codeLocationMatch ? codeLocationMatch[1].trim() : null;
  return { htmlFrame, codeLocation };
}

function extractFilePath(stack: string | null): string | null {
  if (typeof stack !== "string") return null;

  const patterns = [
    /\b(?:in|at)\s+\S+\s*\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
    /\b(?:in|at)\s+((?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gi,
    /\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
    /(?:^|\s)((?:\.\/)?(?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gim,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(stack))) {
      const candidate = match[1]?.trim();
      if (!candidate) continue;
      if (candidate.includes("node_modules")) continue;
      if (candidate.includes("://")) continue;
      return candidate;
    }
  }

  return null;
}

function toRelativePath(filePath: string | null, projectRoot?: string): string | null {
  if (!filePath) return null;
  if (!projectRoot) return filePath;
  const normalizedRoot = projectRoot.endsWith("/") ? projectRoot : `${projectRoot}/`;
  if (filePath.startsWith(normalizedRoot)) {
    const sliced = filePath.slice(normalizedRoot.length);
    return sliced.startsWith("/") ? sliced.slice(1) : sliced;
  }
  return filePath;
}

function applyHighlight(element: HTMLElement | null, selectionId: string) {
  if (!element) return;
  // Don't clear existing highlights - support multiple selections for parallel agents
  element.setAttribute(HIGHLIGHT_ATTR, "true");
  element.setAttribute(SELECTION_ID_ATTR, selectionId);
}

function clearHighlight() {
  // Clear ALL highlights (used for full cleanup)
  const highlighted = document.querySelectorAll<HTMLElement>(`[${HIGHLIGHT_ATTR}="true"]`);
  highlighted.forEach((el) => {
    el.removeAttribute(HIGHLIGHT_ATTR);
    el.removeAttribute(SELECTION_ID_ATTR);
    el.removeAttribute("data-sf-chat-id");
    el.removeAttribute("data-react-grab-loading");
  });
}

function findTooltipElement(): HTMLElement | null {
  const OVERLAY_SELECTOR = '[data-react-grab="true"]';
  const TOOLTIP_SELECTOR = "div.pointer-events-none.bg-grab-pink-light.text-grab-pink";
  const visited = new Set<Node>();

  const visit = (node: Node | null): HTMLElement | null => {
    if (!node || visited.has(node)) return null;
    visited.add(node);

    if (node instanceof HTMLElement || node instanceof DocumentFragment) {
      const queryMatch =
        node instanceof HTMLElement ? node.querySelector<HTMLElement>(TOOLTIP_SELECTOR) : null;
      if (queryMatch) return queryMatch;
      const children = node instanceof HTMLElement ? Array.from(node.children) : [];
      for (const child of children) {
        const found = visit(child);
        if (found) return found;
      }
    }

    if (node instanceof HTMLElement && node.shadowRoot) {
      return visit(node.shadowRoot);
    }

    return null;
  };

  const hosts = document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR);
  for (const host of hosts) {
    const found = visit(host) ?? (host.shadowRoot ? visit(host.shadowRoot) : null);
    if (found) return found;
  }
  return null;
}

function getHoverTagRect(): Rect | null {
  const tooltip = findTooltipElement();
  if (!(tooltip instanceof HTMLElement)) return null;
  const rect = tooltip.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

type SelectionOpenDetail = SelectionPayload & {
  tagRect: unknown;
  selectionId: string;
  targetElement: HTMLElement | null;
};

function dispatchOpenEvent(detail: SelectionOpenDetail) {
  window.dispatchEvent(new CustomEvent(EVENT_OPEN, { detail }));
}

// --- Selection handler ---

function handleSelection(
  elements: Element[],
  content: string,
  options: InitReactGrabOptions,
) {
  const parsed = parseClipboard(content);

  // Generate unique selection ID for this element
  const selectionId = generateSelectionId();

  // Get the first selected element for highlighting
  const element = elements[0] instanceof HTMLElement ? elements[0] : null;

  let boundingRect: Rect | null = null;
  if (element) {
    applyHighlight(element, selectionId);
    const rect = element.getBoundingClientRect();
    boundingRect = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  // Extract and normalize file path
  let filePath = parsed.codeLocation ? extractFilePath(parsed.codeLocation) : null;
  filePath = filePath ? toRelativePath(filePath, options.projectRoot) : null;

  const tagRect = getHoverTagRect();

  // Dispatch the selection event with selection ID for proper element lookup
  dispatchOpenEvent({
    htmlFrame: parsed.htmlFrame,
    codeLocation: parsed.codeLocation,
    filePath,
    clipboardData: content,
    pointer: null, // Not needed with direct element reference
    boundingRect,
    tagRect,
    selectionId,
    targetElement: element,
  } as SelectionOpenDetail);
}

// --- Main init function ---

export async function initReactGrab(
  options: InitReactGrabOptions = {},
): Promise<ReactGrabAPI | null> {
  // Guard 1: SSR check
  if (typeof window === "undefined") {
    return null;
  }

  // Guard 2: Prevent double initialization
  if ((window as unknown as Record<string, boolean>)[INIT_FLAG]) {
    return apiInstance;
  }

  // Guard 3: Check clipboard API availability
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    console.warn("[shipflow-overlay] navigator.clipboard.writeText is not available.");
    return null;
  }

  const highlightColor = options.highlightColor ?? defaultOptions.highlightColor;
  const highlightStyleId = options.highlightStyleId ?? defaultOptions.highlightStyleId;

  // Setup highlight styles
  ensureHighlightStyles(highlightColor, highlightStyleId);
  clearHighlight();

  // Listen for close events to clear highlight
  window.addEventListener(EVENT_CLOSE, clearHighlight);

  // Intercept clipboard to prevent writes (preserve user's clipboard)
  // Store original before overriding
  originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);

  navigator.clipboard.writeText = async (_text: string): Promise<void> => {
    // No-op: Don't write to clipboard, preserve user's existing clipboard
    // The onCopySuccess callback will handle the content directly
    return;
  };

  try {
    // Guard 4: Dynamic import from /core only (never main entry which auto-inits)
    // Use string literal to work around TypeScript moduleResolution issues
    const modulePath = "react-grab/core";
    const reactGrabCore = await import(/* @vite-ignore */ modulePath) as { init: (options: unknown) => ReactGrabAPI };

    apiInstance = reactGrabCore.init({
      theme: { enabled: true },
      onCopySuccess: (elements: Element[], content: string) => {
        handleSelection(elements, content, options);
      },
    });

    // Mark as initialized
    (window as unknown as Record<string, boolean>)[INIT_FLAG] = true;

    return apiInstance;
  } catch (error) {
    console.error("[shipflow-overlay] Failed to initialize React Grab:", error);
    // Restore clipboard on failure
    if (originalWriteText) {
      navigator.clipboard.writeText = originalWriteText;
    }
    return null;
  }
}

// --- Cleanup function ---

export function disposeReactGrab(): void {
  // Dispose the API
  if (apiInstance) {
    try {
      apiInstance.dispose();
    } catch {
      // Ignore disposal errors
    }
    apiInstance = null;
  }

  // Restore original clipboard function
  if (originalWriteText && typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText = originalWriteText;
    originalWriteText = null;
  }

  // Remove event listener
  if (typeof window !== "undefined") {
    window.removeEventListener(EVENT_CLOSE, clearHighlight);
    clearHighlight();
    delete (window as unknown as Record<string, boolean>)[INIT_FLAG];
  }
}

// --- Export utilities for external use ---

export { clearHighlight, applyHighlight, SELECTION_ID_ATTR };
