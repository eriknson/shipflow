import * as react from 'react';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { ClipboardInterceptorOptions } from './register.js';
export { loadReactGrabRuntime, registerClipboardInterceptor } from './register.js';

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
    clipboardOptions?: ClipboardInterceptorOptions;
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
    readonly value: "gpt-5";
    readonly label: "GPT-5";
}, {
    readonly value: "sonnet-4.5";
    readonly label: "Sonnet 4.5";
}, {
    readonly value: "gemini-3";
    readonly label: "Gemini 3";
}];

export { ClipboardInterceptorOptions, DEFAULT_MODEL_OPTIONS, DEFAULT_STATUS_SEQUENCE, type FlowOverlayProps, FlowOverlayProvider, type ModelOption, type ShipflowOverlayConfig, type StatusSequence, Typewriter };
