export const DEFAULT_STATUS_SEQUENCE = [
  'Thinking',
  'Planning next moves',
  'Updating UI',
] as const;

export const DEFAULT_MODEL_OPTIONS = [
  { value: 'composer-1', label: 'Composer 1' },
  { value: 'gemini-3-pro', label: 'Gemini 3 Pro' },
  { value: 'opus-4.5', label: 'Opus 4.5' },
  { value: 'gpt-5.1-codex-high', label: 'GPT-5.1 Codex High' },
] as const;

export const STREAM_HEADERS = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
};
