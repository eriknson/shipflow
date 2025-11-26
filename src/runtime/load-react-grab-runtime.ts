const DEFAULT_SCRIPT_URL =
  'https://unpkg.com/react-grab@0.0.51/dist/index.global.js';
const GLOBAL_FLAG = '__shipflowReactGrabLoaded';

type LoadOptions = {
  url?: string;
};

let pendingLoad: Promise<void> | null = null;

export function loadReactGrabRuntime(options: LoadOptions = {}): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if ((window as unknown as Record<string, unknown>)[GLOBAL_FLAG]) {
    return Promise.resolve();
  }

  if (pendingLoad) {
    return pendingLoad;
  }

  const scriptUrl = options.url ?? DEFAULT_SCRIPT_URL;

  pendingLoad = new Promise<void>((resolve, reject) => {
    const existing = Array.from(document.scripts).find(
      (script) => script.src === scriptUrl,
    );
    if (existing) {
      (window as unknown as Record<string, unknown>)[GLOBAL_FLAG] = true;
      pendingLoad = null;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.crossOrigin = 'anonymous';
    script.async = false;
    script.onload = () => {
      (window as unknown as Record<string, unknown>)[GLOBAL_FLAG] = true;
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
