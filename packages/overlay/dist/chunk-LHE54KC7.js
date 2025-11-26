// src/runtime/constants.ts
var DEFAULT_STATUS_SEQUENCE = [
  "Thinking",
  "Planning next moves",
  "Updating UI"
];
var DEFAULT_MODEL_OPTIONS = [
  { value: "composer-1", label: "Composer 1" },
  { value: "gemini-3-pro", label: "Gemini 3 Pro" },
  { value: "opus-4.5", label: "Opus 4.5" },
  { value: "gpt-5.1-codex-high", label: "GPT-5.1 Codex High" }
];
var STREAM_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform"
};

export {
  DEFAULT_STATUS_SEQUENCE,
  DEFAULT_MODEL_OPTIONS,
  STREAM_HEADERS
};
//# sourceMappingURL=chunk-LHE54KC7.js.map