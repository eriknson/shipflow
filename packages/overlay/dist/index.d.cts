import * as react from 'react';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { InitReactGrabOptions } from './register.cjs';
export { disposeReactGrab, initReactGrab } from './register.cjs';

type ModelOption = {
    value: string;
    label: string;
};
type StatusSequence = readonly string[];
type ShipflowOverlayConfig = {
    endpoint: string;
    models: readonly ModelOption[];
    statusSequence: StatusSequence;
};

type FlowOverlayProps = Partial<ShipflowOverlayConfig> & {
    enableClipboardInterceptor?: boolean;
    clipboardOptions?: InitReactGrabOptions;
};
declare function Typewriter({ text }: {
    text: string;
}): react_jsx_runtime.JSX.Element;
declare function FlowOverlayProvider(props?: FlowOverlayProps): react.ReactPortal | null;

declare const DEFAULT_STATUS_SEQUENCE: readonly ["Thinking", "Planning next moves", "Updating UI"];
declare const DEFAULT_MODEL_OPTIONS: readonly [{
    readonly value: "composer-1";
    readonly label: "Composer 1";
}, {
    readonly value: "gemini-3-pro";
    readonly label: "Gemini 3 Pro";
}, {
    readonly value: "opus-4.5";
    readonly label: "Opus 4.5";
}, {
    readonly value: "gpt-5.1-codex-high";
    readonly label: "GPT-5.1 Codex High";
}];

export { DEFAULT_MODEL_OPTIONS, DEFAULT_STATUS_SEQUENCE, type FlowOverlayProps, FlowOverlayProvider, InitReactGrabOptions, type ModelOption, type ShipflowOverlayConfig, type StatusSequence, Typewriter };
