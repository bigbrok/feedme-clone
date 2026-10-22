export type LlmTarget = "chatgpt" | "claude";

export type HandoffPlan =
  | { mode: "prefill"; url: string }
  | { mode: "clipboard"; url: string; clipboardText: string };

const TARGET_URLS: Record<LlmTarget, string> = {
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
};

// Spec assumption: keep the whole URL under ~8,000 characters after encoding.
const MAX_URL_LENGTH = 8000;

function withQuery(base: string, text: string) {
  if (!text) return base;
  const url = new URL(base);
  url.searchParams.set("q", text);
  return url.href;
}

export function planLlmHandoff({
  target,
  prompt,
  markdown,
}: {
  target: LlmTarget;
  prompt: string;
  markdown: string;
}): HandoffPlan {
  const trimmedPrompt = prompt.trim();
  const message = trimmedPrompt ? `${trimmedPrompt}\n\n${markdown}` : markdown;
  const base = TARGET_URLS[target];

  const prefillUrl = withQuery(base, message);
  if (prefillUrl.length <= MAX_URL_LENGTH) {
    return { mode: "prefill", url: prefillUrl };
  }

  return { mode: "clipboard", url: withQuery(base, trimmedPrompt), clipboardText: message };
}
