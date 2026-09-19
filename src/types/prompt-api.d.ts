/**
 * Chrome's built-in Prompt API (Gemini Nano). Shape as of Chrome 138+.
 * https://developer.chrome.com/docs/ai/prompt-api
 */
type LanguageModelAvailability = "unavailable" | "downloadable" | "downloading" | "available";

interface LanguageModelPrompt {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LanguageModelCreateOptions {
  initialPrompts?: LanguageModelPrompt[];
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  expectedInputs?: { type: "text"; languages?: string[] }[];
  expectedOutputs?: { type: "text"; languages?: string[] }[];
  monitor?: (m: EventTarget & { addEventListener(type: "downloadprogress", cb: (e: { loaded: number; total?: number }) => void): void }) => void;
}

interface LanguageModelSession {
  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string>;
  promptStreaming(input: string, options?: { signal?: AbortSignal }): ReadableStream<string>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(options?: Partial<LanguageModelCreateOptions>): Promise<LanguageModelAvailability>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
  params(): Promise<{ defaultTemperature: number; defaultTopK: number; maxTopK: number }>;
}

declare const LanguageModel: LanguageModelStatic | undefined;

interface Window {
  LanguageModel?: LanguageModelStatic;
}
