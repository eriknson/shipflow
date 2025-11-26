import {
  DEFAULT_MODEL_OPTIONS,
  DEFAULT_STATUS_SEQUENCE
} from "./chunk-LHE54KC7.js";
import {
  disposeReactGrab,
  initReactGrab
} from "./chunk-5GYDZT7T.js";

// src/runtime/FlowOverlay.tsx
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { ArrowUp, Square, Command } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var HIGHLIGHT_ATTR = "data-react-grab-chat-highlighted";
var HIGHLIGHT_QUERY = `[${HIGHLIGHT_ATTR}='true']`;
var LOADING_ATTR = "data-react-grab-loading";
var SHIMMER_ATTR = "data-sf-shimmer-overlay";
var OVERLAY_STYLE_ID = "shipflow-overlay-styles";
var OVERLAY_ROOT_ID = "shipflow-overlay-root";
var ensureOverlayStyles = (root) => {
  var _a, _b, _c;
  if ("getElementById" in root && root.getElementById(OVERLAY_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = OVERLAY_STYLE_ID;
  style.textContent = `
:host {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.5;
  color: var(--sf-text);
  font-size: 14px;
  --sf-bg: rgba(250, 250, 250, 0.7);
  --sf-border: rgba(229, 229, 229, 0.5);
  --sf-text: #171717;
  --sf-muted-text: #6b7280;
  --sf-placeholder: #9ca3af;
  --sf-inline-bg: rgba(212, 212, 212, 0.6);
  --sf-inline-hover-bg: rgba(212, 212, 212, 0.85);
  --sf-inline-text: #4b5563;
  --sf-inline-disabled-opacity: 0.5;
  --sf-select-bg: rgba(0, 0, 0, 0.035);
  --sf-select-hover-bg: rgba(212, 212, 212, 0.25);
  --sf-select-text: #4b5563;
  --sf-focus-ring: rgba(212, 212, 212, 0.5);
  --sf-submit-bg: #171717;
  --sf-submit-hover-bg: #262626;
  --sf-submit-text: #ffffff;
  --sf-status-bg: rgba(245, 245, 245, 0.45);
  --sf-status-border: rgba(229, 229, 229, 0.3);
  --sf-error-bg: rgba(254, 242, 242, 0.6);
  --sf-error-border: rgba(254, 202, 202, 0.5);
  --sf-error-text: #dc2626;
  --sf-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --sf-body-gap: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  :host {
    --sf-bg: rgba(23, 23, 23, 0.75);
    --sf-border: rgba(64, 64, 64, 0.5);
    --sf-text: #f5f5f5;
    --sf-muted-text: #a3a3a3;
    --sf-placeholder: #737373;
    --sf-inline-bg: rgba(64, 64, 64, 0.5);
    --sf-inline-hover-bg: rgba(64, 64, 64, 0.8);
    --sf-inline-text: #e5e5e5;
    --sf-select-bg: rgba(255, 255, 255, 0.045);
    --sf-select-hover-bg: rgba(64, 64, 64, 0.3);
    --sf-select-text: #a3a3a3;
    --sf-focus-ring: rgba(64, 64, 64, 0.5);
    --sf-submit-bg: #f5f5f5;
    --sf-submit-hover-bg: #e5e5e5;
    --sf-submit-text: #111827;
    --sf-status-bg: rgba(23, 23, 23, 0.35);
    --sf-status-border: rgba(64, 64, 64, 0.4);
    --sf-error-bg: rgba(239, 68, 68, 0.18);
    --sf-error-border: rgba(239, 68, 68, 0.35);
    --sf-error-text: #fecaca;
    --sf-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  }
}

:host([data-theme="dark"]),
:host-context(.dark) {
  --sf-bg: rgba(23, 23, 23, 0.75);
  --sf-border: rgba(64, 64, 64, 0.5);
  --sf-text: #f5f5f5;
  --sf-muted-text: #a3a3a3;
  --sf-placeholder: #737373;
  --sf-inline-bg: rgba(64, 64, 64, 0.5);
  --sf-inline-hover-bg: rgba(64, 64, 64, 0.8);
  --sf-inline-text: #e5e5e5;
  --sf-select-bg: rgba(38, 38, 38, 0.6);
  --sf-select-hover-bg: rgba(38, 38, 38, 0.8);
  --sf-select-text: #d4d4d4;
  --sf-focus-ring: rgba(64, 64, 64, 0.5);
  --sf-submit-bg: #f5f5f5;
  --sf-submit-hover-bg: #e5e5e5;
  --sf-submit-text: #111827;
  --sf-status-bg: rgba(23, 23, 23, 0.35);
  --sf-status-border: rgba(64, 64, 64, 0.4);
  --sf-error-bg: rgba(239, 68, 68, 0.18);
  --sf-error-border: rgba(239, 68, 68, 0.35);
  --sf-error-text: #fecaca;
  --sf-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}

:host *,
:host *::before,
:host *::after {
  box-sizing: border-box;
  font-family: inherit;
}

[data-react-grab-chat-bubble="true"] {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  width: 100%;
  max-width: 400px;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--sf-border);
  background: var(--sf-bg);
  color: var(--sf-text);
  box-shadow: var(--sf-shadow);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  animation: shipflow-fade-in 120ms ease-out;
  pointer-events: auto;
}

[data-sf-body="true"] {
  display: flex;
  flex-direction: column;
  gap: var(--sf-body-gap);
  padding: 12px;
}

[data-sf-body="true"][data-expanded="false"] {
  --sf-body-gap: 0;
}

[data-sf-row="input"] {
  display: flex;
  align-items: center;
  position: relative;
}

[data-sf-input="true"] {
  width: 100%;
  resize: none;
  border: none;
  background: transparent;
  color: var(--sf-text);
  font-size: 0.875rem;
  line-height: 1.6;
  padding-right: 2.5rem;
  outline: none;
}

[data-sf-input="true"][data-expanded="true"] {
  padding-right: 0;
}

[data-sf-input="true"]::placeholder {
  color: var(--sf-placeholder);
}

[data-sf-input="true"][disabled] {
  opacity: 0.6;
}

[data-sf-inline-submit="true"] {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 2rem;
  border-radius: 9999px;
  background: var(--sf-inline-bg);
  color: var(--sf-inline-text);
  border: none;
  cursor: pointer;
  transition: background-color 150ms ease, transform 150ms ease, opacity 150ms ease;
}

[data-sf-inline-submit="true"]:hover:not([disabled]) {
  background: var(--sf-inline-hover-bg);
}

[data-sf-inline-submit="true"][disabled] {
  opacity: var(--sf-inline-disabled-opacity);
  cursor: default;
}

[data-sf-toolbar="true"] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

[data-sf-select-wrapper="true"] {
  position: relative;
  display: inline-flex;
  align-items: center;
}

[data-sf-select="true"] {
  height: 2rem;
  appearance: none;
  border-radius: 8px;
  border: none;
  background: var(--sf-select-bg);
  color: var(--sf-select-text);
  padding: 0 26px 0 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease, box-shadow 150ms ease;
}

[data-sf-select="true"]:hover:not([disabled]) {
  background: var(--sf-select-hover-bg);
}

[data-sf-select="true"]:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--sf-focus-ring);
}

[data-sf-select="true"][disabled] {
  opacity: 0.55;
  cursor: default;
}

[data-sf-select-chevron="true"] {
  position: absolute;
  pointer-events: none;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sf-placeholder);
}

[data-sf-submit="true"] {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 2rem;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  background: var(--sf-submit-bg);
  color: var(--sf-submit-text);
  transition: transform 150ms ease, background-color 150ms ease, opacity 150ms ease;
}

[data-sf-submit="true"]:hover:not([disabled]) {
  background: var(--sf-submit-hover-bg);
  transform: scale(1.05);
}

[data-sf-submit="true"][disabled] {
  opacity: 0.65;
  cursor: default;
  transform: scale(1);
}

[data-sf-submit="true"][data-hidden="true"] {
  opacity: 0;
  pointer-events: none;
}

[data-sf-status="true"] {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--sf-status-border);
  background: var(--sf-status-bg);
  padding: 10px 12px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

[data-sf-status="true"][data-mode="progress"] {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--sf-muted-text);
}

[data-sf-status-header="true"] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

[data-sf-status-label="true"] {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 0.75rem;
  color: var(--sf-muted-text);
  flex-shrink: 0;
}

[data-sf-status-context="true"] {
  flex: 1 1 auto;
  min-width: 0;
  text-align: right;
  color: var(--sf-muted-text);
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-sf-status="true"][data-mode="summary"] {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--sf-muted-text);
}

[data-sf-status="true"][data-mode="summary"] [data-sf-status-header="true"] {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

[data-sf-status="true"][data-mode="summary"] [data-sf-undo="true"] {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--sf-muted-text);
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
  transition: color 120ms ease;
}

[data-sf-status="true"][data-mode="summary"] [data-sf-undo="true"]:hover {
  color: var(--sf-text);
}

[data-sf-undo-wrapper="true"] {
  display: flex;
  align-items: center;
  gap: 12px;
}

[data-sf-undo="true"] svg {
  width: 12px;
  height: 12px;
}

[data-sf-error="true"] {
  border-top: 1px solid var(--sf-error-border);
  background: var(--sf-error-bg);
  color: var(--sf-error-text);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 10px 12px;
}

[data-sf-icon="cursor"] {
  width: 14px;
  height: 14px;
}

[data-sf-icon="cursor"][data-loading="true"] {
  animation: shipflow-pulse 1.5s ease-in-out infinite;
}

[data-sf-inline-submit="true"] svg,
[data-sf-submit="true"] svg {
  width: 14px;
  height: 14px;
}

[data-sf-submit="true"][data-submitting="true"] svg {
  width: 12px;
  height: 12px;
  fill: currentColor;
}

[data-sf-shimmer="true"] {
  background: linear-gradient(90deg, var(--sf-muted-text), transparent, var(--sf-muted-text));
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shipflow-shimmer 2.4s linear infinite;
  opacity: 0.75;
}

@keyframes shipflow-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shipflow-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes shipflow-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.25; }
}
`;
  const target = root instanceof Document ? (_c = (_b = (_a = root.head) != null ? _a : root.body) != null ? _b : root.documentElement) != null ? _c : root : root;
  target.appendChild(style);
};
var getOrCreateOverlayMount = () => {
  var _a;
  if (typeof document === "undefined") {
    return null;
  }
  let container = document.getElementById(OVERLAY_ROOT_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = OVERLAY_ROOT_ID;
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "0";
    container.style.height = "0";
    container.style.zIndex = "2147483646";
    document.body.appendChild(container);
  }
  let root;
  if (typeof container.attachShadow === "function") {
    root = (_a = container.shadowRoot) != null ? _a : container.attachShadow({ mode: "open" });
  } else {
    root = container;
  }
  return { container, root };
};
var EVENT_OPEN = "react-grab-chat:open";
var EVENT_CLOSE = "react-grab-chat:close";
var EVENT_UNDO = "react-grab-chat:undo";
var DEFAULT_CONFIG = {
  endpoint: "/api/shipflow/overlay",
  models: DEFAULT_MODEL_OPTIONS,
  statusSequence: DEFAULT_STATUS_SEQUENCE
};
var DEFAULT_BUBBLE_STYLE = {
  top: "20%",
  left: "50%",
  transform: "translate(-50%, -50%)"
};
var VIEWPORT_MARGIN = 12;
var ANCHOR_GAP = 24;
var POINTER_HORIZONTAL_GAP = 16;
var POINTER_VERTICAL_OFFSET = 12;
var createInitialState = (models, statusSequence) => {
  var _a, _b, _c;
  return {
    htmlFrame: null,
    codeLocation: null,
    filePath: null,
    clipboardData: "",
    pointer: null,
    boundingRect: null,
    instruction: "",
    status: "idle",
    serverMessage: void 0,
    error: void 0,
    model: (_b = (_a = models[0]) == null ? void 0 : _a.value) != null ? _b : "",
    statusPhase: 0,
    statusAddonMode: "idle",
    statusLabel: (_c = statusSequence[0]) != null ? _c : null,
    statusContext: null,
    useTypewriter: true,
    summary: void 0
  };
};
function CursorIcon({ loading }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      viewBox: "0 0 466.73 533.32",
      "data-sf-icon": "cursor",
      "data-loading": loading ? "true" : void 0,
      xmlns: "http://www.w3.org/2000/svg",
      shapeRendering: "geometricPrecision",
      children: [
        /* @__PURE__ */ jsx("path", { fill: "#72716d", d: "M233.37,266.66l231.16,133.46c-1.42,2.46-3.48,4.56-6.03,6.03l-216.06,124.74c-5.61,3.24-12.53,3.24-18.14,0L8.24,406.15c-2.55-1.47-4.61-3.57-6.03-6.03l231.16-133.46h0Z" }),
        /* @__PURE__ */ jsx("path", { fill: "#55544f", d: "M233.37,0v266.66L2.21,400.12c-1.42-2.46-2.21-5.3-2.21-8.24v-250.44c0-5.89,3.14-11.32,8.24-14.27L224.29,2.43c2.81-1.62,5.94-2.43,9.07-2.43h.01Z" }),
        /* @__PURE__ */ jsx("path", { fill: "#43413c", d: "M464.52,133.2c-1.42-2.46-3.48-4.56-6.03-6.03L242.43,2.43c-2.8-1.62-5.93-2.43-9.06-2.43v266.66l231.16,133.46c1.42-2.46,2.21-5.3,2.21-8.24v-250.44c0-2.95-.78-5.77-2.21-8.24h-.01Z" }),
        /* @__PURE__ */ jsx("path", { fill: "#d6d5d2", d: "M448.35,142.54c1.31,2.26,1.49,5.16,0,7.74l-209.83,363.42c-1.41,2.46-5.16,1.45-5.16-1.38v-239.48c0-1.91-.51-3.75-1.44-5.36l216.42-124.95h.01Z" }),
        /* @__PURE__ */ jsx("path", { fill: "#fff", d: "M448.35,142.54l-216.42,124.95c-.92-1.6-2.26-2.96-3.92-3.92L20.62,143.83c-2.46-1.41-1.45-5.16,1.38-5.16h419.65c2.98,0,5.4,1.61,6.7,3.87Z" })
      ]
    }
  );
}
function useSelectionEvents(onOpen, onClose, isOpen) {
  useEffect(() => {
    const handler = (event) => {
      const custom = event;
      if (!custom.detail) return;
      if (isOpen) {
        onClose();
      }
      onOpen(custom.detail);
    };
    window.addEventListener(EVENT_OPEN, handler);
    return () => window.removeEventListener(EVENT_OPEN, handler);
  }, [onOpen, onClose, isOpen]);
}
function useRecalculateRect(chat, setChat) {
  useEffect(() => {
    if (!chat) return;
    const updateRect = () => {
      const element = document.querySelector(HIGHLIGHT_QUERY);
      if (!(element instanceof HTMLElement)) {
        setChat((current) => {
          if (!current || current.boundingRect === null) {
            return current;
          }
          return { ...current, boundingRect: null };
        });
        return;
      }
      const rect = element.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const nextRect = {
        top: rect.top + scrollY,
        left: rect.left + scrollX,
        width: rect.width,
        height: rect.height
      };
      setChat((current) => {
        if (!current) {
          return current;
        }
        const prev = current.boundingRect;
        const hasChanged = !prev || prev.top !== nextRect.top || prev.left !== nextRect.left || prev.width !== nextRect.width || prev.height !== nextRect.height;
        if (!hasChanged) {
          return current;
        }
        return {
          ...current,
          boundingRect: nextRect
        };
      });
    };
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [chat, setChat]);
}
function useEscapeToClose(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [isOpen, onClose]);
}
function useAutoFocus(isOpen, shadowRoot) {
  useEffect(() => {
    if (!isOpen || !shadowRoot) return;
    const frame = requestAnimationFrame(() => {
      const root = shadowRoot instanceof ShadowRoot ? shadowRoot : document;
      const textarea = root.querySelector(
        "[data-react-grab-chat-input='true']"
      );
      textarea == null ? void 0 : textarea.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, shadowRoot]);
}
function useClickOutside(ref, isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      const path = event.composedPath();
      const clickedInsideBubble = ref.current && path.includes(ref.current);
      if (clickedInsideBubble) {
        return;
      }
      const highlightedElement = document.querySelector(HIGHLIGHT_QUERY);
      const clickedInsideHighlight = highlightedElement && path.includes(highlightedElement);
      if (!clickedInsideHighlight) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [ref, isOpen, onClose]);
}
function Typewriter({ text }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 15);
    return () => clearInterval(timer);
  }, [text]);
  return /* @__PURE__ */ jsx(Fragment, { children: displayed });
}
function Bubble({
  chat,
  onInstructionChange,
  onSubmit,
  onStop,
  onModelChange,
  onClose,
  onUndo,
  modelOptions,
  statusSequence
}) {
  var _a, _b, _c;
  const anchor = chat.boundingRect;
  const bubbleRef = useRef(null);
  const [bubbleSize, setBubbleSize] = useState(null);
  const [bubbleStyle, setBubbleStyle] = useState(DEFAULT_BUBBLE_STYLE);
  const textareaRef = useRef(null);
  const selectedModelLabel = useMemo(() => {
    var _a2;
    const selected = modelOptions.find((opt) => opt.value === chat.model);
    return (_a2 = selected == null ? void 0 : selected.label) != null ? _a2 : chat.model;
  }, [modelOptions, chat.model]);
  const selectWidth = useMemo(() => {
    const charWidth = selectedModelLabel.length * 0.8;
    return `calc(${charWidth}ch + 44px)`;
  }, [selectedModelLabel]);
  useClickOutside(bubbleRef, true, onClose);
  useLayoutEffect(() => {
    const node = bubbleRef.current;
    if (!node) return;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setBubbleSize((prev) => {
        if (prev && prev.width === rect.width && prev.height === rect.height) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };
    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(node);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, []);
  useLayoutEffect(() => {
    var _a2;
    if (!bubbleSize) {
      setBubbleStyle((prev) => prev === DEFAULT_BUBBLE_STYLE ? prev : DEFAULT_BUBBLE_STYLE);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const verticalGap = ANCHOR_GAP;
    const horizontalGap = ANCHOR_GAP;
    const clampHorizontal = (value) => {
      const min = VIEWPORT_MARGIN;
      const max = viewportWidth - VIEWPORT_MARGIN - bubbleSize.width;
      if (min > max) {
        return (viewportWidth - bubbleSize.width) / 2;
      }
      return Math.min(Math.max(value, min), max);
    };
    const clampVertical = (value) => {
      const min = VIEWPORT_MARGIN;
      const max = viewportHeight - VIEWPORT_MARGIN - bubbleSize.height;
      if (min > max) {
        return (viewportHeight - bubbleSize.height) / 2;
      }
      return Math.min(Math.max(value, min), max);
    };
    const computeOverflow = (top, left) => {
      const overflowTop = Math.max(VIEWPORT_MARGIN - top, 0);
      const overflowBottom = Math.max(
        top + bubbleSize.height - (viewportHeight - VIEWPORT_MARGIN),
        0
      );
      const overflowLeft = Math.max(VIEWPORT_MARGIN - left, 0);
      const overflowRight = Math.max(
        left + bubbleSize.width - (viewportWidth - VIEWPORT_MARGIN),
        0
      );
      return overflowTop + overflowBottom + overflowLeft + overflowRight;
    };
    const pointer = chat.pointer;
    let bestStyle = null;
    if (anchor) {
      const anchorViewport = {
        top: anchor.top - scrollY,
        left: anchor.left - scrollX,
        width: anchor.width,
        height: anchor.height
      };
      const anchorCenterX = anchorViewport.left + anchorViewport.width / 2;
      const anchorCenterY = anchorViewport.top + anchorViewport.height / 2;
      const candidates = [];
      const bottomTop = anchorViewport.top + anchorViewport.height + verticalGap;
      const bottomLeft = clampHorizontal(anchorCenterX - bubbleSize.width / 2);
      candidates.push({
        name: "bottom",
        top: bottomTop,
        left: bottomLeft,
        fits: bottomTop + bubbleSize.height <= viewportHeight - VIEWPORT_MARGIN,
        overflow: computeOverflow(bottomTop, bottomLeft)
      });
      const topTop = anchorViewport.top - verticalGap - bubbleSize.height;
      const topLeft = clampHorizontal(anchorCenterX - bubbleSize.width / 2);
      candidates.push({
        name: "top",
        top: topTop,
        left: topLeft,
        fits: topTop >= VIEWPORT_MARGIN,
        overflow: computeOverflow(topTop, topLeft)
      });
      const rightLeft = anchorViewport.left + anchorViewport.width + horizontalGap;
      const rightTop = clampVertical(anchorCenterY - bubbleSize.height / 2);
      candidates.push({
        name: "right",
        top: rightTop,
        left: rightLeft,
        fits: rightLeft + bubbleSize.width <= viewportWidth - VIEWPORT_MARGIN,
        overflow: computeOverflow(rightTop, rightLeft)
      });
      const leftLeft = anchorViewport.left - horizontalGap - bubbleSize.width;
      const leftTop = clampVertical(anchorCenterY - bubbleSize.height / 2);
      candidates.push({
        name: "left",
        top: leftTop,
        left: leftLeft,
        fits: leftLeft >= VIEWPORT_MARGIN,
        overflow: computeOverflow(leftTop, leftLeft)
      });
      const baseOrder = ["bottom", "top", "right", "left"];
      const orderedCandidates = baseOrder.map((name) => candidates.find((candidate) => candidate.name === name)).filter((candidate) => Boolean(candidate));
      const perfectCandidate = orderedCandidates.find(
        (candidate) => candidate.fits && candidate.overflow === 0
      );
      if (perfectCandidate) {
        bestStyle = {
          top: `${Math.round(perfectCandidate.top)}px`,
          left: `${Math.round(perfectCandidate.left)}px`
        };
      } else if (!pointer) {
        const bestCandidate = (_a2 = orderedCandidates.find((candidate) => candidate.fits)) != null ? _a2 : orderedCandidates.length > 0 ? orderedCandidates.reduce(
          (best, candidate) => candidate.overflow < best.overflow ? candidate : best,
          orderedCandidates[0]
        ) : null;
        if (bestCandidate) {
          bestStyle = {
            top: `${Math.round(bestCandidate.top)}px`,
            left: `${Math.round(bestCandidate.left)}px`
          };
        }
      }
    }
    if (!bestStyle && pointer) {
      const pointerTopRaw = pointer.y - POINTER_VERTICAL_OFFSET;
      const clampedTop = clampVertical(pointerTopRaw);
      const rightLeftRaw = pointer.x + POINTER_HORIZONTAL_GAP;
      const fitsRight = rightLeftRaw + bubbleSize.width <= viewportWidth - VIEWPORT_MARGIN;
      let targetLeft = rightLeftRaw;
      if (!fitsRight) {
        const leftLeftRaw = pointer.x - POINTER_HORIZONTAL_GAP - bubbleSize.width;
        targetLeft = leftLeftRaw;
      }
      const clampedLeft = clampHorizontal(targetLeft);
      bestStyle = {
        top: `${Math.round(clampedTop)}px`,
        left: `${Math.round(clampedLeft)}px`
      };
    }
    if (bestStyle) {
      setBubbleStyle((prev) => {
        if (prev.top === bestStyle.top && prev.left === bestStyle.left && !("transform" in prev)) {
          return prev;
        }
        return bestStyle;
      });
      return;
    }
    setBubbleStyle((prev) => prev === DEFAULT_BUBBLE_STYLE ? prev : DEFAULT_BUBBLE_STYLE);
  }, [anchor, bubbleSize, chat.pointer]);
  const isSubmitting = chat.status === "submitting";
  const hasInput = chat.instruction.trim().length > 0;
  const showExpandedLayout = hasInput || chat.status !== "idle";
  const disableEditing = isSubmitting;
  const computedStatusLabel = (_c = (_b = (_a = chat.statusLabel) != null ? _a : statusSequence[chat.statusPhase]) != null ? _b : statusSequence[0]) != null ? _c : null;
  const handleUndo = useCallback(() => {
    var _a2;
    if (chat.statusAddonMode !== "summary") {
      return;
    }
    onUndo();
    window.dispatchEvent(
      new CustomEvent(EVENT_UNDO, {
        detail: {
          instruction: chat.instruction,
          summary: (_a2 = chat.summary) != null ? _a2 : null,
          filePath: chat.filePath,
          sessionId: chat.sessionId
        }
      })
    );
  }, [chat, onUndo]);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const minRows = showExpandedLayout ? 2 : 1;
    textarea.rows = minRows;
    textarea.style.height = "auto";
    const computedStyles = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyles.lineHeight) || 24;
    const borderOffset = textarea.offsetHeight - textarea.clientHeight;
    const minHeight = lineHeight * minRows + borderOffset;
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
  }, [chat.instruction, showExpandedLayout]);
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter") return;
      if (event.shiftKey) {
        return;
      }
      event.preventDefault();
      if (!isSubmitting && hasInput) {
        onSubmit();
      }
    },
    [hasInput, isSubmitting, onSubmit]
  );
  const handleChange = useCallback(
    (event) => {
      onInstructionChange(event.target.value);
    },
    [onInstructionChange]
  );
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: bubbleRef,
      style: bubbleStyle,
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Shipflow overlay request",
      "data-react-grab-chat-bubble": "true",
      "data-react-grab": "true",
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            "data-sf-body": "true",
            "data-expanded": showExpandedLayout ? "true" : "false",
            children: [
              /* @__PURE__ */ jsxs("div", { "data-sf-row": "input", children: [
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    ref: textareaRef,
                    "data-react-grab-chat-input": "true",
                    rows: showExpandedLayout ? 2 : 1,
                    placeholder: "Change anything",
                    value: chat.instruction,
                    onChange: handleChange,
                    onKeyDown: handleKeyDown,
                    disabled: disableEditing,
                    "data-sf-input": "true",
                    "data-expanded": showExpandedLayout ? "true" : "false"
                  }
                ),
                !showExpandedLayout ? /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: onSubmit,
                    disabled: !hasInput || isSubmitting,
                    "data-sf-inline-submit": "true",
                    children: /* @__PURE__ */ jsx(ArrowUp, {})
                  }
                ) : null
              ] }),
              showExpandedLayout ? /* @__PURE__ */ jsxs("div", { "data-sf-toolbar": "true", children: [
                /* @__PURE__ */ jsxs("div", { "data-sf-select-wrapper": "true", children: [
                  /* @__PURE__ */ jsx(
                    "select",
                    {
                      "aria-label": "Model selection",
                      value: chat.model,
                      onChange: (event) => onModelChange(event.target.value),
                      disabled: disableEditing,
                      "data-sf-select": "true",
                      style: { width: selectWidth },
                      children: modelOptions.map((option) => /* @__PURE__ */ jsx("option", { value: option.value, children: option.label }, option.value))
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { "data-sf-select-chevron": "true", children: /* @__PURE__ */ jsx("svg", { width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M1 1l4 4 4-4", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: isSubmitting ? onStop : onSubmit,
                    disabled: !hasInput && !isSubmitting,
                    "data-sf-submit": "true",
                    "data-hidden": !hasInput && !isSubmitting ? "true" : "false",
                    "data-submitting": isSubmitting ? "true" : "false",
                    children: isSubmitting ? /* @__PURE__ */ jsx(Square, {}) : /* @__PURE__ */ jsx(ArrowUp, {})
                  }
                )
              ] }) : null
            ]
          }
        ),
        chat.statusAddonMode !== "idle" && /* @__PURE__ */ jsx(
          "div",
          {
            "data-sf-status": "true",
            "data-mode": chat.statusAddonMode,
            children: chat.statusAddonMode === "progress" ? /* @__PURE__ */ jsxs("div", { "data-sf-status-header": "true", children: [
              /* @__PURE__ */ jsxs("div", { "data-sf-status-label": "true", children: [
                /* @__PURE__ */ jsx(CursorIcon, { loading: true }),
                /* @__PURE__ */ jsx("span", { "data-sf-shimmer": "true", children: computedStatusLabel })
              ] }),
              chat.statusContext && /* @__PURE__ */ jsx("span", { "data-sf-status-context": "true", children: chat.useTypewriter ? /* @__PURE__ */ jsx(Typewriter, { text: chat.statusContext }) : chat.statusContext })
            ] }) : chat.statusAddonMode === "summary" && chat.summary ? /* @__PURE__ */ jsxs("div", { "data-sf-status-header": "true", children: [
              /* @__PURE__ */ jsxs("div", { "data-sf-status-label": "true", children: [
                /* @__PURE__ */ jsx(CursorIcon, {}),
                /* @__PURE__ */ jsx("span", { children: "Changes applied" })
              ] }),
              /* @__PURE__ */ jsx("div", { "data-sf-undo-wrapper": "true", children: /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleUndo,
                  "data-sf-undo": "true",
                  children: [
                    "Undo ",
                    /* @__PURE__ */ jsx(Command, {}),
                    " Z"
                  ]
                }
              ) })
            ] }) : null
          }
        ),
        chat.error ? /* @__PURE__ */ jsx("div", { "data-sf-error": "true", children: chat.error }) : null
      ]
    }
  );
}
function FlowOverlayProvider(props = {}) {
  var _a;
  const [portalTarget, setPortalTarget] = useState(null);
  const overlayContainerRef = useRef(null);
  useEffect(() => {
    const mount = getOrCreateOverlayMount();
    if (!mount) return;
    overlayContainerRef.current = mount.container;
    if (mount.root instanceof ShadowRoot) {
      ensureOverlayStyles(mount.root);
    } else if (typeof document !== "undefined") {
      ensureOverlayStyles(document);
    }
    setPortalTarget(mount.root);
    return () => {
      if (mount.container.childNodes.length === 0 && mount.container.isConnected) {
        mount.container.remove();
      }
    };
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const container = overlayContainerRef.current;
    if (!container) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => {
      const docEl = document.documentElement;
      const hasDark = docEl.classList.contains("dark");
      const hasLight = docEl.classList.contains("light");
      const isDark = hasDark || !hasLight && media.matches;
      container.dataset.theme = isDark ? "dark" : "light";
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    media.addEventListener("change", updateTheme);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateTheme);
    };
  }, [portalTarget]);
  const clipboardOptions = useMemo(
    () => {
      var _a2;
      return (_a2 = props.clipboardOptions) != null ? _a2 : {};
    },
    [props.clipboardOptions]
  );
  const config = useMemo(() => {
    var _a2;
    const models = props.models && props.models.length > 0 ? props.models : DEFAULT_CONFIG.models;
    const statusSequence = props.statusSequence && props.statusSequence.length > 0 ? props.statusSequence : DEFAULT_CONFIG.statusSequence;
    const endpoint = (_a2 = props.endpoint) != null ? _a2 : DEFAULT_CONFIG.endpoint;
    return {
      endpoint,
      models,
      statusSequence
    };
  }, [props.endpoint, props.models, props.statusSequence]);
  const [chat, setChat] = useState(null);
  const abortControllerRef = useRef(null);
  const fallbackStatusLabel = (_a = config.statusSequence[0]) != null ? _a : null;
  useEffect(() => {
    if (props.enableClipboardInterceptor === false) {
      return;
    }
    let mounted = true;
    initReactGrab({
      projectRoot: clipboardOptions.projectRoot,
      highlightColor: clipboardOptions.highlightColor,
      highlightStyleId: clipboardOptions.highlightStyleId
    }).catch((error) => {
      if (mounted) {
        console.error("[shipflow-overlay] Failed to initialize React Grab:", error);
      }
    });
    return () => {
      mounted = false;
      disposeReactGrab();
    };
  }, [
    clipboardOptions.highlightColor,
    clipboardOptions.highlightStyleId,
    clipboardOptions.projectRoot,
    props.enableClipboardInterceptor
  ]);
  const close = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setChat(null);
    window.dispatchEvent(new Event(EVENT_CLOSE));
  }, []);
  const buildInitialState = useCallback(
    () => createInitialState(config.models, config.statusSequence),
    [config.models, config.statusSequence]
  );
  useSelectionEvents(
    useCallback(
      (payload) => {
        setChat({
          ...buildInitialState(),
          ...payload
        });
      },
      [buildInitialState]
    ),
    close,
    Boolean(chat)
  );
  useRecalculateRect(chat, setChat);
  useEscapeToClose(Boolean(chat), close);
  useAutoFocus(Boolean(chat), portalTarget);
  const sendToBackend = useCallback(
    async (payload) => {
      var _a2, _b;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const promotePhase = (phase) => {
        const safePhase = Math.min(Math.max(phase, 0), config.statusSequence.length - 1);
        setChat((prev) => {
          var _a3;
          if (!prev) return prev;
          if (prev.statusPhase === safePhase && prev.statusLabel) {
            return prev;
          }
          return {
            ...prev,
            statusPhase: safePhase,
            statusLabel: (_a3 = config.statusSequence[safePhase]) != null ? _a3 : fallbackStatusLabel
          };
        });
      };
      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          signal: controller.signal,
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error((_a2 = data == null ? void 0 : data.error) != null ? _a2 : `Request failed with status ${response.status}`);
        }
        const reader = (_b = response.body) == null ? void 0 : _b.getReader();
        if (!reader) {
          throw new Error("Streaming response is not supported in this environment.");
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantSummary = "";
        let hasPromotedPlanning = false;
        let hasPromotedUpdating = false;
        const processEvent = (event) => {
          var _a3, _b2, _c;
          if (event.event === "session") {
            setChat(
              (prev) => prev ? {
                ...prev,
                sessionId: event.sessionId
              } : prev
            );
            return;
          }
          if (event.event === "status") {
            const message = (_a3 = event.message) == null ? void 0 : _a3.trim();
            if (message) {
              if (!hasPromotedPlanning && /plan|analy/i.test(message)) {
                promotePhase(1);
                hasPromotedPlanning = true;
              }
              if (!hasPromotedUpdating && /apply|build|final|update/i.test(message)) {
                promotePhase(2);
                hasPromotedUpdating = true;
              }
              setChat(
                (prev) => prev ? {
                  ...prev,
                  statusContext: message,
                  useTypewriter: true
                } : prev
              );
            }
            if (!hasPromotedPlanning) {
              promotePhase(0);
            }
            return;
          }
          if (event.event === "assistant") {
            const chunk = (_b2 = event.text) == null ? void 0 : _b2.trim();
            if (chunk) {
              assistantSummary += chunk.endsWith("\n") ? chunk : `${chunk} `;
              if (!hasPromotedPlanning) {
                promotePhase(1);
                hasPromotedPlanning = true;
              }
              setChat(
                (prev) => prev ? {
                  ...prev,
                  statusContext: chunk,
                  useTypewriter: false
                } : prev
              );
            }
            return;
          }
          if (event.event === "done") {
            if (event.success) {
              promotePhase(2);
              hasPromotedUpdating = true;
              const summary = ((_c = event.summary) == null ? void 0 : _c.trim()) || assistantSummary.trim() || "Changes applied.";
              setChat(
                (prev) => prev ? {
                  ...prev,
                  status: "success",
                  instruction: "",
                  statusAddonMode: "summary",
                  summary,
                  statusLabel: null,
                  statusContext: null,
                  statusPhase: Math.max(config.statusSequence.length - 1, 0),
                  serverMessage: event.stderr ? event.stderr.trim() : prev.serverMessage
                } : prev
              );
            } else {
              setChat(
                (prev) => {
                  var _a4;
                  return prev ? {
                    ...prev,
                    status: "error",
                    error: (_a4 = event.error) != null ? _a4 : "Cursor CLI reported an error.",
                    statusAddonMode: "idle",
                    statusLabel: null,
                    statusContext: null,
                    summary: void 0,
                    statusPhase: 0,
                    serverMessage: event.stderr ? event.stderr.trim() : prev.serverMessage
                  } : prev;
                }
              );
            }
          }
        };
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (line) {
              try {
                processEvent(JSON.parse(line));
              } catch (error) {
                console.warn("[shipflow-overlay] Unable to parse stream line", { line, error });
              }
            }
            newlineIndex = buffer.indexOf("\n");
          }
        }
        buffer += decoder.decode();
        const finalLine = buffer.trim();
        if (finalLine) {
          try {
            processEvent(JSON.parse(finalLine));
          } catch (error) {
            console.warn("[shipflow-overlay] Unable to parse final stream line", { finalLine, error });
          }
        }
      } catch (error) {
        if (controller.signal.aborted) {
          setChat(
            (prev) => prev ? {
              ...prev,
              status: "idle",
              statusAddonMode: "idle",
              statusLabel: null,
              statusContext: null,
              summary: void 0,
              error: void 0,
              serverMessage: void 0,
              statusPhase: 0
            } : prev
          );
          return;
        }
        console.error("[shipflow-overlay] Failed to communicate with Cursor CLI backend", error);
        setChat(
          (prev) => prev ? {
            ...prev,
            status: "error",
            error: error instanceof Error ? error.message : "Unable to send request.",
            statusAddonMode: "idle",
            statusLabel: null,
            statusContext: null,
            summary: void 0
          } : prev
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [config.endpoint, config.models, config.statusSequence, fallbackStatusLabel]
  );
  const onInstructionChange = useCallback((value) => {
    setChat((current) => {
      if (!current) {
        return current;
      }
      const next = {
        ...current,
        instruction: value
      };
      if (current.status !== "submitting") {
        next.status = "idle";
      }
      if (value.length > 0 && current.statusAddonMode !== "idle") {
        next.statusAddonMode = "idle";
        next.statusLabel = null;
        next.statusContext = null;
        next.summary = void 0;
        next.statusPhase = 0;
      }
      if (current.status === "error") {
        next.error = void 0;
      }
      return next;
    });
  }, []);
  const onSubmit = useCallback(() => {
    let payload = null;
    setChat((current) => {
      var _a2, _b;
      if (!current) return current;
      if (current.status === "submitting") return current;
      const trimmed = current.instruction.trim();
      if (!trimmed) {
        return {
          ...current,
          error: "Please describe the change.",
          status: "error",
          statusAddonMode: "idle",
          statusLabel: null,
          statusContext: null,
          summary: void 0,
          statusPhase: 0,
          serverMessage: void 0
        };
      }
      payload = {
        filePath: current.filePath,
        htmlFrame: current.htmlFrame,
        stackTrace: current.codeLocation,
        instruction: trimmed,
        model: current.model || ((_a2 = config.models[0]) == null ? void 0 : _a2.value) || ""
      };
      return {
        ...current,
        instruction: trimmed,
        status: "submitting",
        error: void 0,
        serverMessage: void 0,
        statusAddonMode: "progress",
        statusLabel: (_b = config.statusSequence[0]) != null ? _b : fallbackStatusLabel,
        statusContext: "Preparing Cursor CLI request\u2026",
        summary: void 0,
        statusPhase: 0
      };
    });
    if (payload) {
      void sendToBackend(payload);
    }
  }, [config.models, config.statusSequence, fallbackStatusLabel, sendToBackend]);
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  const onModelChange = useCallback(
    (value) => {
      setChat((current) => {
        var _a2, _b;
        if (!current || current.status === "submitting") {
          return current;
        }
        const nextValue = config.models.some((option) => option.value === value) ? value : (_b = (_a2 = config.models[0]) == null ? void 0 : _a2.value) != null ? _b : "";
        return { ...current, model: nextValue };
      });
    },
    [config.models]
  );
  const shimmerRef = useRef({ overlay: null, element: null, scrollHandler: null, resizeHandler: null });
  useEffect(() => {
    const highlighted = document.querySelector(HIGHLIGHT_QUERY);
    const isLoading = (chat == null ? void 0 : chat.status) === "submitting";
    const shimmer = shimmerRef.current;
    if (isLoading && highlighted && highlighted.isConnected) {
      highlighted.setAttribute(LOADING_ATTR, "true");
      if (!shimmer.overlay) {
        const overlay = document.createElement("div");
        overlay.setAttribute(SHIMMER_ATTR, "true");
        document.body.appendChild(overlay);
        shimmer.overlay = overlay;
        shimmer.element = highlighted;
        const updatePosition = () => {
          if (!highlighted.isConnected || !shimmer.overlay) return;
          const rect = highlighted.getBoundingClientRect();
          shimmer.overlay.style.top = `${rect.top}px`;
          shimmer.overlay.style.left = `${rect.left}px`;
          shimmer.overlay.style.width = `${rect.width}px`;
          shimmer.overlay.style.height = `${rect.height}px`;
        };
        updatePosition();
        shimmer.scrollHandler = () => updatePosition();
        shimmer.resizeHandler = () => updatePosition();
        window.addEventListener("scroll", shimmer.scrollHandler, true);
        window.addEventListener("resize", shimmer.resizeHandler);
      }
    } else {
      if (shimmer.overlay) {
        if (shimmer.scrollHandler) {
          window.removeEventListener("scroll", shimmer.scrollHandler, true);
        }
        if (shimmer.resizeHandler) {
          window.removeEventListener("resize", shimmer.resizeHandler);
        }
        shimmer.overlay.remove();
        shimmer.overlay = null;
        shimmer.scrollHandler = null;
        shimmer.resizeHandler = null;
      }
      if (shimmer.element) {
        shimmer.element.removeAttribute(LOADING_ATTR);
        shimmer.element = null;
      }
      if (highlighted) {
        highlighted.removeAttribute(LOADING_ATTR);
      }
    }
    return () => {
      if (shimmer.overlay) {
        if (shimmer.scrollHandler) {
          window.removeEventListener("scroll", shimmer.scrollHandler, true);
        }
        if (shimmer.resizeHandler) {
          window.removeEventListener("resize", shimmer.resizeHandler);
        }
        shimmer.overlay.remove();
        shimmer.overlay = null;
        shimmer.scrollHandler = null;
        shimmer.resizeHandler = null;
      }
      if (shimmer.element) {
        shimmer.element.removeAttribute(LOADING_ATTR);
        shimmer.element = null;
      }
    };
  }, [chat == null ? void 0 : chat.status]);
  const onUndo = useCallback(async () => {
    const sessionId = chat == null ? void 0 : chat.sessionId;
    if (!sessionId) {
      console.warn("[shipflow-overlay] No session ID available for undo");
      return;
    }
    try {
      const undoEndpoint = config.endpoint.replace(/\/overlay\/?$/, "/undo");
      const response = await fetch(undoEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sessionId })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error("[shipflow-overlay] Undo failed:", data.error);
        return;
      }
      setChat(
        (prev) => prev ? {
          ...prev,
          status: "idle",
          statusAddonMode: "idle",
          summary: void 0,
          sessionId: void 0
        } : prev
      );
    } catch (error) {
      console.error("[shipflow-overlay] Undo failed:", error);
    }
  }, [chat == null ? void 0 : chat.sessionId, config.endpoint]);
  if (!portalTarget || !chat) {
    return null;
  }
  return createPortal(
    /* @__PURE__ */ jsx(
      Bubble,
      {
        chat,
        onInstructionChange,
        onSubmit,
        onStop: stop,
        onModelChange,
        onClose: close,
        onUndo,
        modelOptions: config.models,
        statusSequence: config.statusSequence
      }
    ),
    portalTarget
  );
}
export {
  DEFAULT_MODEL_OPTIONS,
  DEFAULT_STATUS_SEQUENCE,
  FlowOverlayProvider,
  Typewriter,
  disposeReactGrab,
  initReactGrab
};
//# sourceMappingURL=index.js.map