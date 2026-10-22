import { describe, expect, it } from "vitest";

import { planLlmHandoff } from "@/features/llm-handoff";

describe("planLlmHandoff", () => {
  it("짧은 내용은 ChatGPT 입력창에 프롬프트와 본문을 채워 연다", () => {
    const plan = planLlmHandoff({ target: "chatgpt", prompt: "요약해줘", markdown: "# 제목\n본문" });

    expect(plan.mode).toBe("prefill");
    const url = new URL(plan.url);
    expect(url.origin + url.pathname).toBe("https://chatgpt.com/");
    expect(url.searchParams.get("q")).toBe("요약해줘\n\n# 제목\n본문");
  });

  it("짧은 내용은 Claude 새 대화 입력창에 채워 연다", () => {
    const plan = planLlmHandoff({ target: "claude", prompt: "", markdown: "본문" });

    expect(plan.mode).toBe("prefill");
    const url = new URL(plan.url);
    expect(url.origin + url.pathname).toBe("https://claude.ai/new");
    expect(url.searchParams.get("q")).toBe("본문");
  });

  it("길이 기준을 넘으면 전체를 클립보드로 넘기고 URL에는 프롬프트만 담는다", () => {
    const markdown = "가".repeat(5000);

    const plan = planLlmHandoff({ target: "claude", prompt: "쉽게 설명해줘", markdown });

    expect(plan.mode).toBe("clipboard");
    if (plan.mode !== "clipboard") return;
    expect(plan.clipboardText).toBe(`쉽게 설명해줘\n\n${markdown}`);
    expect(new URL(plan.url).searchParams.get("q")).toBe("쉽게 설명해줘");
  });

  it("길이 기준을 넘고 프롬프트가 없으면 빈 새 대화를 연다", () => {
    const plan = planLlmHandoff({ target: "chatgpt", prompt: "  ", markdown: "a".repeat(9000) });

    expect(plan.mode).toBe("clipboard");
    expect(plan.url).toBe("https://chatgpt.com/");
  });
});
