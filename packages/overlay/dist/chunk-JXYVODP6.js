// src/runtime/loadReactGrabRuntime.ts
var DEFAULT_SCRIPT_URL = "https://unpkg.com/react-grab@0.0.51/dist/index.global.js";
var GLOBAL_FLAG = "__shipflowReactGrabLoaded";
var pendingLoad = null;
function loadReactGrabRuntime(options = {}) {
  var _a;
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window[GLOBAL_FLAG]) {
    return Promise.resolve();
  }
  if (pendingLoad) {
    return pendingLoad;
  }
  const scriptUrl = (_a = options.url) != null ? _a : DEFAULT_SCRIPT_URL;
  pendingLoad = new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find((script2) => script2.src === scriptUrl);
    if (existing) {
      window[GLOBAL_FLAG] = true;
      pendingLoad = null;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.crossOrigin = "anonymous";
    script.async = false;
    script.onload = () => {
      window[GLOBAL_FLAG] = true;
      pendingLoad = null;
      resolve();
    };
    script.onerror = (error) => {
      pendingLoad = null;
      reject(error instanceof ErrorEvent ? error.error : error);
    };
    document.head.appendChild(script);
  });
  return pendingLoad;
}

// src/runtime/registerClipboardInterceptor.ts
var GLOBAL_KEY = "__shipflowOverlayCleanup";
var HIGHLIGHT_ATTR = "data-react-grab-chat-highlighted";
var STYLE_ID = "shipflow-overlay-highlight-style";
var EVENT_OPEN = "react-grab-chat:open";
var EVENT_CLOSE = "react-grab-chat:close";
var defaultOptions = {
  highlightColor: "#ff40e0",
  highlightStyleId: STYLE_ID
};
function ensureHighlightStyles(color, styleId) {
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
[${HIGHLIGHT_ATTR}="true"] {
  outline: 2px solid ${color};
  outline-offset: 2px;
  transition: outline 0.2s ease;
}`;
  document.head.appendChild(style);
}
function parseClipboard(text) {
  if (typeof text !== "string") {
    return { htmlFrame: null, codeLocation: null };
  }
  const htmlFrameMatch = text.match(/## HTML Frame:\n([\s\S]*?)(?=\n## Code Location:|$)/);
  const codeLocationMatch = text.match(/## Code Location:\n([\s\S]*?)(?=\n<\/selected_element>|$)/);
  const selectedElementMatch = text.match(/<selected_element>\n([\s\S]*?)\n<\/selected_element>/);
  const htmlFrame = htmlFrameMatch ? htmlFrameMatch[1].trim() : selectedElementMatch ? selectedElementMatch[1].trim() : null;
  const codeLocation = codeLocationMatch ? codeLocationMatch[1].trim() : null;
  return { htmlFrame, codeLocation };
}
function extractFilePath(stack) {
  var _a;
  if (typeof stack !== "string") return null;
  const patterns = [
    // Format: "in Component (path/to/file.tsx:10:5)" or "at Component (path/to/file.tsx:10:5)"
    /\b(?:in|at)\s+\S+\s*\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
    // Format: "in path/to/file.tsx" or "at path/to/file.tsx"
    /\b(?:in|at)\s+((?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gi,
    // Format: just "(path/to/file.tsx:10:5)" in parentheses
    /\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
    // Format: bare path like "app/page.tsx" or "./app/page.tsx"
    /(?:^|\s)((?:\.\/)?(?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gim
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match = null;
    while (match = pattern.exec(stack)) {
      const candidate = (_a = match[1]) == null ? void 0 : _a.trim();
      if (!candidate) continue;
      if (candidate.includes("node_modules")) continue;
      if (candidate.includes("://")) continue;
      return candidate;
    }
  }
  return null;
}
function toRelativePath(filePath, projectRoot) {
  if (!filePath) return null;
  if (!projectRoot) return filePath;
  const normalizedRoot = projectRoot.endsWith("/") ? projectRoot : `${projectRoot}/`;
  if (filePath.startsWith(normalizedRoot)) {
    const sliced = filePath.slice(normalizedRoot.length);
    return sliced.startsWith("/") ? sliced.slice(1) : sliced;
  }
  return filePath;
}
function findElementAtPoint(clientX, clientY) {
  var _a;
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    if ((_a = element.closest) == null ? void 0 : _a.call(element, "[data-react-grab]")) continue;
    const style = window.getComputedStyle(element);
    if (style.pointerEvents === "none" || style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) {
      continue;
    }
    return element;
  }
  return null;
}
function findTooltipElement() {
  var _a;
  const OVERLAY_SELECTOR = '[data-react-grab="true"]';
  const TOOLTIP_SELECTOR = "div.pointer-events-none.bg-grab-pink-light.text-grab-pink";
  const visited = /* @__PURE__ */ new Set();
  const visit = (node) => {
    if (!node || visited.has(node)) {
      return null;
    }
    visited.add(node);
    if (node instanceof HTMLElement || node instanceof DocumentFragment) {
      const queryMatch = node instanceof HTMLElement ? node.querySelector(TOOLTIP_SELECTOR) : null;
      if (queryMatch) {
        return queryMatch;
      }
      const children = node instanceof HTMLElement ? Array.from(node.children) : [];
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
  const hosts = document.querySelectorAll(OVERLAY_SELECTOR);
  for (const host of hosts) {
    const found = (_a = visit(host)) != null ? _a : host.shadowRoot ? visit(host.shadowRoot) : null;
    if (found) {
      return found;
    }
  }
  return null;
}
function getHoverTagRect() {
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
    height: rect.height
  };
}
function applyHighlight(element) {
  if (!element) return;
  const previous = document.querySelector(`[${HIGHLIGHT_ATTR}="true"]`);
  if (previous && previous !== element) {
    previous.removeAttribute(HIGHLIGHT_ATTR);
  }
  element.setAttribute(HIGHLIGHT_ATTR, "true");
}
function clearHighlight() {
  const highlighted = document.querySelector(`[${HIGHLIGHT_ATTR}="true"]`);
  highlighted == null ? void 0 : highlighted.removeAttribute(HIGHLIGHT_ATTR);
}
function dispatchOpenEvent(detail) {
  window.dispatchEvent(
    new CustomEvent(EVENT_OPEN, {
      detail
    })
  );
}
function registerClipboardInterceptor(options = {}) {
  var _a, _b;
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return () => void 0;
  }
  if (window[GLOBAL_KEY]) {
    return window[GLOBAL_KEY];
  }
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    console.warn("[shipflow-overlay] navigator.clipboard.writeText is not available.");
    return () => void 0;
  }
  const projectRoot = options.projectRoot;
  const highlightColor = (_a = options.highlightColor) != null ? _a : defaultOptions.highlightColor;
  const highlightStyleId = (_b = options.highlightStyleId) != null ? _b : defaultOptions.highlightStyleId;
  const logClipboardEndpoint = options.logClipboardEndpoint === void 0 ? null : options.logClipboardEndpoint;
  ensureHighlightStyles(highlightColor, highlightStyleId);
  clearHighlight();
  void loadReactGrabRuntime({ url: options.reactGrabUrl });
  let lastPointer = null;
  const pointerListener = (event) => {
    const pointer = event;
    lastPointer = { clientX: pointer.clientX, clientY: pointer.clientY };
  };
  window.addEventListener("pointerup", pointerListener, true);
  window.addEventListener(EVENT_CLOSE, clearHighlight);
  const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
  const overrideWriteText = async function(text) {
    const parsed = parseClipboard(text);
    const isReactGrabPayload = Boolean(parsed.htmlFrame || parsed.codeLocation);
    const result = await originalWriteText(text);
    if (!isReactGrabPayload) {
      return result;
    }
    const pointer = lastPointer;
    lastPointer = null;
    const pointerPayload = pointer ? { x: pointer.clientX, y: pointer.clientY } : null;
    let boundingRect = null;
    let element = null;
    if (pointer) {
      element = findElementAtPoint(pointer.clientX, pointer.clientY);
    }
    if (!element) {
      const fallback = document.querySelector(`[${HIGHLIGHT_ATTR}="true"]`);
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
        height: rect.height
      };
    }
    let filePath = parsed.codeLocation ? extractFilePath(parsed.codeLocation) : null;
    filePath = filePath ? toRelativePath(filePath, projectRoot) : null;
    const tagRect = getHoverTagRect();
    dispatchOpenEvent({
      htmlFrame: parsed.htmlFrame,
      codeLocation: parsed.codeLocation,
      filePath,
      clipboardData: text,
      pointer: pointerPayload,
      boundingRect,
      tagRect
    });
    if (logClipboardEndpoint) {
      try {
        await fetch(logClipboardEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clipboardData: text,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            filePath
          })
        });
      } catch (error) {
        console.error("[shipflow-overlay] Failed to log clipboard payload", error);
      }
    }
    return result;
  };
  navigator.clipboard.writeText = overrideWriteText;
  const cleanup = () => {
    window.removeEventListener("pointerup", pointerListener, true);
    window.removeEventListener(EVENT_CLOSE, clearHighlight);
    if (navigator.clipboard.writeText === overrideWriteText) {
      navigator.clipboard.writeText = originalWriteText;
    }
    clearHighlight();
    delete window[GLOBAL_KEY];
  };
  window[GLOBAL_KEY] = cleanup;
  return cleanup;
}

export {
  loadReactGrabRuntime,
  registerClipboardInterceptor
};
//# sourceMappingURL=chunk-JXYVODP6.js.map