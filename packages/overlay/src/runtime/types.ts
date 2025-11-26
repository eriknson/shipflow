export type Pointer = {
  x: number;
  y: number;
};

export type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type SelectionPayload = {
  htmlFrame: string | null;
  codeLocation: string | null;
  filePath: string | null;
  clipboardData: string;
  pointer: Pointer | null;
  boundingRect: Rect | null;
};

export type StatusAddonMode = "idle" | "progress" | "summary";

export type StreamEvent =
  | { event: "session"; sessionId: string }
  | { event: "status"; message: string }
  | { event: "assistant"; text: string }
  | {
      event: "done";
      success: boolean;
      summary: string;
      exitCode: number | null;
      error?: string;
      stderr?: string;
    };

export type ModelOption = {
  value: string;
  label: string;
};

export type StatusSequence = readonly string[];

export type ShipflowOverlayConfig = {
  endpoint: string;
  models: readonly ModelOption[];
  statusSequence: StatusSequence;
};



