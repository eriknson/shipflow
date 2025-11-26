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
type InitReactGrabOptions = {
    projectRoot?: string;
    highlightColor?: string;
    highlightStyleId?: string;
};
declare function initReactGrab(options?: InitReactGrabOptions): Promise<ReactGrabAPI | null>;
declare function disposeReactGrab(): void;

export { type InitReactGrabOptions, disposeReactGrab, initReactGrab };
