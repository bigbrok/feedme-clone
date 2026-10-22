import { describe, expect, it } from "vitest";

import { toMarkdownFileName } from "@/features/export";

describe("toMarkdownFileName", () => {
  it("페이지 제목에서 파일에 쓸 수 없는 문자를 빼고 .md를 붙인다", () => {
    expect(toMarkdownFileName({ title: 'A/B: "Why?" 마크다운', domain: "x.com" })).toBe(
      "A-B-Why-마크다운.md",
    );
  });

  it("제목이 없으면 도메인을 파일명으로 쓴다", () => {
    expect(toMarkdownFileName({ title: "  ", domain: "example.com" })).toBe("example.com.md");
  });
});
