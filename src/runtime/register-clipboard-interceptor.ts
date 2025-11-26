import { loadReactGrabRuntime } from './load-react-grab-runtime';
import type { SelectionPayload } from './types';

const GLOBAL_KEY = '__shipflowOverlayCleanup';
const HIGHLIGHT_ATTR = 'data-react-grab-chat-highlighted';
const STYLE_ID = 'shipflow-overlay-highlight-style';
const EVENT_OPEN = 'react-grab-chat:open';
const EVENT_CLOSE = 'react-grab-chat:close';

type ClipboardParseResult = {
  htmlFrame: string | null;
  codeLocation: string | null;
};

export type ClipboardInterceptorOptions = {
  projectRoot?: string;
  highlightColor?: string;
  highlightStyleId?: string;
  logClipboardEndpoint?: string | null;
  reactGrabUrl?: string;
};

const defaultOptions: Required<
  Pick<ClipboardInterceptorOptions, 'highlightColor' | 'highlightStyleId'>
> = {
  highlightColor: '#ff40e0',
  highlightStyleId: STYLE_ID,
};

function ensureHighlightStyles(color: string, styleId: string) {
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
[${HIGHLIGHT_ATTR}="true"] {
  outline: 2px solid ${color};
  outline-offset: 2px;
  transition: outline 0.2s ease;
}`;
  document.head.appendChild(style);
}

function parseClipboard(text: string): ClipboardParseResult {
  if (typeof text !== 'string') {
    return { htmlFrame: null, codeLocation: null };
  }
  const htmlFrameMatch = text.match(
    /## HTML Frame:\n([\s\S]*?)(?=\n## Code Location:|$)/,
  );
  const codeLocationMatch = text.match(
    /## Code Location:\n([\s\S]*?)(?=\n<\/selected_element>|$)/,
  );
  const selectedElementMatch = text.match(
    /<selected_element>\n([\s\S]*?)\n<\/selected_element>/,
  );
  const htmlFrame = htmlFrameMatch
    ? htmlFrameMatch[1].trim()
    : selectedElementMatch
      ? selectedElementMatch[1].trim()
      : null;
  const codeLocation = codeLocationMatch ? codeLocationMatch[1].trim() : null;
  return { htmlFrame, codeLocation };
}

function extractFilePath(stack: string | null): string | null {
  if (typeof stack !== 'string') return null;

  // Try multiple patterns to handle different formats from react-grab
  const patterns = [
    // Format: "in Component (path/to/file.tsx:10:5)" or "at Component (path/to/file.tsx:10:5)"
    /\b(?:in|at)\s+\S+\s*\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
    // Format: "in path/to/file.tsx" or "at path/to/file.tsx"
    /\b(?:in|at)\s+((?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gi,
    // Format: just "(path/to/file.tsx:10:5)" in parentheses
    /\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
    // Format: bare path like "app/page.tsx" or "./app/page.tsx"
    /(?:^|\s)((?:\.\/)?(?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gim,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(stack))) {
      const candidate = match[1]?.trim();
      if (!candidate) continue;
      // Skip node_modules paths
      if (candidate.includes('node_modules')) continue;
      // Skip if it looks like a URL
      if (candidate.includes('://')) continue;
      return candidate;
    }
  }

  return null;
}

function toRelativePath(
  filePath: string | null,
  projectRoot?: string,
): string | null {
  if (!filePath) return null;
  if (!projectRoot) return filePath;
  const normalizedRoot = projectRoot.endsWith('/')
    ? projectRoot
    : `${projectRoot}/`;
  if (filePath.startsWith(normalizedRoot)) {
    const sliced = filePath.slice(normalizedRoot.length);
    return sliced.startsWith('/') ? sliced.slice(1) : sliced;
  }
  return filePath;
}

type Pointer = { clientX: number; clientY: number };

function findElementAtPoint(
  clientX: number,
  clientY: number,
): HTMLElement | null {
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.closest?.('[data-react-grab]')) continue;
    const style = window.getComputedStyle(element);
    if (
      style.pointerEvents === 'none' ||
      style.visibility === 'hidden' ||
      style.display === 'none' ||
      Number(style.opacity) === 0
    ) {
      continue;
    }
    return element;
  }
  return null;
}

function findTooltipElement(): HTMLElement | null {
  const OVERLAY_SELECTOR = '[data-react-grab="true"]';
  const TOOLTIP_SELECTOR =
    'div.pointer-events-none.bg-grab-pink-light.text-grab-pink';
  const visited = new Set<Node>();

  const visit = (node: Node | null): HTMLElement | null => {
    if (!node || visited.has(node)) {
      return null;
    }
    visited.add(node);

    if (node instanceof HTMLElement || node instanceof DocumentFragment) {
      const queryMatch =
        node instanceof HTMLElement
          ? node.querySelector<HTMLElement>(TOOLTIP_SELECTOR)
          : null;
      if (queryMatch) {
        return queryMatch;
      }
      const children =
        node instanceof HTMLElement ? Array.from(node.children) : [];
      for (const child of children) {
        const found = visit(child);
        if (found) {
          return found;
        }
      }
    }

    if (node instanceof HTMLElement && node.shadowRoot) {
      return visit(node.shadowRoot);
    }

    return null;
  };

  const hosts = document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR);
  for (const host of hosts) {
    const found =
      visit(host) ?? (host.shadowRoot ? visit(host.shadowRoot) : null);
    if (found) {
      return found;
    }
  }
  return null;
}

function getHoverTagRect(): {
  top: number;
  left: number;
  width: number;
  height: number;
} | null {
  const tooltip = findTooltipElement();
  if (!(tooltip instanceof HTMLElement)) {
    return null;
  }
  const rect = tooltip.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return null;
  }
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function applyHighlight(element: HTMLElement | null) {
  if (!element) return;
  const previous = document.querySelector<HTMLElement>(
    `[${HIGHLIGHT_ATTR}="true"]`,
  );
  if (previous && previous !== element) {
    previous.removeAttribute(HIGHLIGHT_ATTR);
  }
  element.setAttribute(HIGHLIGHT_ATTR, 'true');
}

function clearHighlight() {
  const highlighted = document.querySelector<HTMLElement>(
    `[${HIGHLIGHT_ATTR}="true"]`,
  );
  highlighted?.removeAttribute(HIGHLIGHT_ATTR);
}

function dispatchOpenEvent(detail: SelectionPayload & { tagRect: unknown }) {
  window.dispatchEvent(
    new CustomEvent(EVENT_OPEN, {
      detail,
    }),
  );
}

export function registerClipboardInterceptor(
  options: ClipboardInterceptorOptions = {},
): () => void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return () => undefined;
  }

  if ((window as unknown as Record<string, () => void>)[GLOBAL_KEY]) {
    return (window as unknown as Record<string, () => void>)[GLOBAL_KEY];
  }

  if (
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== 'function'
  ) {
    console.warn(
      '[shipflow-overlay] navigator.clipboard.writeText is not available.',
    );
    return () => undefined;
  }

  const projectRoot = options.projectRoot;
  const highlightColor =
    options.highlightColor ?? defaultOptions.highlightColor;
  const highlightStyleId =
    options.highlightStyleId ?? defaultOptions.highlightStyleId;
  const logClipboardEndpoint =
    options.logClipboardEndpoint === undefined
      ? null
      : options.logClipboardEndpoint;

  ensureHighlightStyles(highlightColor, highlightStyleId);
  clearHighlight();
  void loadReactGrabRuntime({ url: options.reactGrabUrl });

  let lastPointer: Pointer | null = null;

  const pointerListener = (event: Event) => {
    const pointer = event as PointerEvent;
    lastPointer = { clientX: pointer.clientX, clientY: pointer.clientY };
  };

  window.addEventListener('pointerup', pointerListener, true);
  window.addEventListener(EVENT_CLOSE, clearHighlight);

  const originalWriteText = navigator.clipboard.writeText.bind(
    navigator.clipboard,
  );

  const overrideWriteText = async function (text: string) {
    const parsed = parseClipboard(text);
    const isReactGrabPayload = Boolean(parsed.htmlFrame || parsed.codeLocation);

    const result = await originalWriteText(text);

    if (!isReactGrabPayload) {
      return result;
    }

    const pointer = lastPointer;
    lastPointer = null;
    const pointerPayload = pointer
      ? { x: pointer.clientX, y: pointer.clientY }
      : null;

    let boundingRect: SelectionPayload['boundingRect'] = null;
    let element: HTMLElement | null = null;

    if (pointer) {
      element = findElementAtPoint(pointer.clientX, pointer.clientY);
    }

    if (!element) {
      const fallback = document.querySelector<HTMLElement>(
        `[${HIGHLIGHT_ATTR}="true"]`,
      );
      if (fallback) {
        element = fallback;
      }
    }

    if (element instanceof HTMLElement) {
      applyHighlight(element);
      const rect = element.getBoundingClientRect();
      boundingRect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    }

    let filePath = parsed.codeLocation
      ? extractFilePath(parsed.codeLocation)
      : null;
    filePath = filePath ? toRelativePath(filePath, projectRoot) : null;

    const tagRect = getHoverTagRect();

    dispatchOpenEvent({
      htmlFrame: parsed.htmlFrame,
      codeLocation: parsed.codeLocation,
      filePath,
      clipboardData: text,
      pointer: pointerPayload,
      boundingRect,
      tagRect,
    } as SelectionPayload & { tagRect: unknown });

    if (logClipboardEndpoint) {
      try {
        await fetch(logClipboardEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clipboardData: text,
            timestamp: new Date().toISOString(),
            filePath,
          }),
        });
      } catch (error) {
        console.error(
          '[shipflow-overlay] Failed to log clipboard payload',
          error,
        );
      }
    }

    return result;
  };

  navigator.clipboard.writeText = overrideWriteText;

  const cleanup = () => {
    window.removeEventListener('pointerup', pointerListener, true);
    window.removeEventListener(EVENT_CLOSE, clearHighlight);
    if ((navigator.clipboard.writeText as unknown) === overrideWriteText) {
      navigator.clipboard.writeText = originalWriteText;
    }
    clearHighlight();
    delete (window as unknown as Record<string, () => void>)[GLOBAL_KEY];
  };

  (window as unknown as Record<string, () => void>)[GLOBAL_KEY] = cleanup;
  return cleanup;
}
