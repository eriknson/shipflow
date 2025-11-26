// src/runtime/initReactGrab.ts
var INIT_FLAG = "__shipflowReactGrabInitialized";
var HIGHLIGHT_ATTR = "data-react-grab-chat-highlighted";
var SELECTION_ID_ATTR = "data-sf-selection-id";
var STYLE_ID = "shipflow-overlay-highlight-style";
var EVENT_OPEN = "react-grab-chat:open";
var EVENT_CLOSE = "react-grab-chat:close";
var selectionIdCounter = 0;
var generateSelectionId = () => `sel-${++selectionIdCounter}-${Date.now()}`;
var apiInstance = null;
var originalWriteText = null;
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
    /\b(?:in|at)\s+\S+\s*\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
    /\b(?:in|at)\s+((?:[A-Za-z]:)?[^\s:()]+?\.(?:[jt]sx?|mdx?))/gi,
    /\(([^()]+?\.(?:[jt]sx?|mdx?))(?::\d+)*\)/gi,
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
function applyHighlight(element, selectionId) {
  if (!element) return;
  element.setAttribute(HIGHLIGHT_ATTR, "true");
  element.setAttribute(SELECTION_ID_ATTR, selectionId);
}
function clearHighlight() {
  const highlighted = document.querySelectorAll(`[${HIGHLIGHT_ATTR}="true"]`);
  highlighted.forEach((el) => {
    el.removeAttribute(HIGHLIGHT_ATTR);
    el.removeAttribute(SELECTION_ID_ATTR);
    el.removeAttribute("data-sf-chat-id");
    el.removeAttribute("data-react-grab-loading");
  });
}
function findTooltipElement() {
  var _a;
  const OVERLAY_SELECTOR = '[data-react-grab="true"]';
  const TOOLTIP_SELECTOR = "div.pointer-events-none.bg-grab-pink-light.text-grab-pink";
  const visited = /* @__PURE__ */ new Set();
  const visit = (node) => {
    if (!node || visited.has(node)) return null;
    visited.add(node);
    if (node instanceof HTMLElement || node instanceof DocumentFragment) {
      const queryMatch = node instanceof HTMLElement ? node.querySelector(TOOLTIP_SELECTOR) : null;
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
  const hosts = document.querySelectorAll(OVERLAY_SELECTOR);
  for (const host of hosts) {
    const found = (_a = visit(host)) != null ? _a : host.shadowRoot ? visit(host.shadowRoot) : null;
    if (found) return found;
  }
  return null;
}
function getHoverTagRect() {
  const tooltip = findTooltipElement();
  if (!(tooltip instanceof HTMLElement)) return null;
  const rect = tooltip.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}
function dispatchOpenEvent(detail) {
  window.dispatchEvent(new CustomEvent(EVENT_OPEN, { detail }));
}
function handleSelection(elements, content, options) {
  const parsed = parseClipboard(content);
  const selectionId = generateSelectionId();
  const element = elements[0] instanceof HTMLElement ? elements[0] : null;
  let boundingRect = null;
  if (element) {
    applyHighlight(element, selectionId);
    const rect = element.getBoundingClientRect();
    boundingRect = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };
  }
  let filePath = parsed.codeLocation ? extractFilePath(parsed.codeLocation) : null;
  filePath = filePath ? toRelativePath(filePath, options.projectRoot) : null;
  const tagRect = getHoverTagRect();
  dispatchOpenEvent({
    htmlFrame: parsed.htmlFrame,
    codeLocation: parsed.codeLocation,
    filePath,
    clipboardData: content,
    pointer: null,
    // Not needed with direct element reference
    boundingRect,
    tagRect,
    selectionId,
    targetElement: element
  });
}
async function initReactGrab(options = {}) {
  var _a, _b;
  if (typeof window === "undefined") {
    return null;
  }
  if (window[INIT_FLAG]) {
    return apiInstance;
  }
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    console.warn("[shipflow-overlay] navigator.clipboard.writeText is not available.");
    return null;
  }
  const highlightColor = (_a = options.highlightColor) != null ? _a : defaultOptions.highlightColor;
  const highlightStyleId = (_b = options.highlightStyleId) != null ? _b : defaultOptions.highlightStyleId;
  ensureHighlightStyles(highlightColor, highlightStyleId);
  clearHighlight();
  window.addEventListener(EVENT_CLOSE, clearHighlight);
  originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
  navigator.clipboard.writeText = async (_text) => {
    return;
  };
  try {
    const modulePath = "react-grab/core";
    const reactGrabCore = await import(
      /* @vite-ignore */
      modulePath
    );
    apiInstance = reactGrabCore.init({
      theme: { enabled: true },
      onCopySuccess: (elements, content) => {
        handleSelection(elements, content, options);
      }
    });
    window[INIT_FLAG] = true;
    return apiInstance;
  } catch (error) {
    console.error("[shipflow-overlay] Failed to initialize React Grab:", error);
    if (originalWriteText) {
      navigator.clipboard.writeText = originalWriteText;
    }
    return null;
  }
}
function disposeReactGrab() {
  if (apiInstance) {
    try {
      apiInstance.dispose();
    } catch {
    }
    apiInstance = null;
  }
  if (originalWriteText && typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText = originalWriteText;
    originalWriteText = null;
  }
  if (typeof window !== "undefined") {
    window.removeEventListener(EVENT_CLOSE, clearHighlight);
    clearHighlight();
    delete window[INIT_FLAG];
  }
}

export {
  initReactGrab,
  disposeReactGrab
};
//# sourceMappingURL=chunk-5GYDZT7T.js.map