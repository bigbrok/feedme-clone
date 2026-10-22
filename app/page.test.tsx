import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

function mockConvertResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function convert(url: string) {
  fireEvent.change(screen.getByLabelText("변환할 URL"), { target: { value: url } });
  fireEvent.click(screen.getByRole("button", { name: "변환" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("홈 화면", () => {
  it("URL을 변환하면 제목·저자 헤더와 렌더링된 본문을 보여준다", async () => {
    const fetchMock = mockConvertResponse({
      ok: true,
      page: {
        url: "https://stephango.com/file-over-app",
        title: "File over app",
        author: "Steph Ango",
        site: "Steph Ango",
        domain: "stephango.com",
        markdown: "*File over app* is a philosophy.\n\n## Files last",
      },
    });
    render(<Home />);

    await convert("https://stephango.com/file-over-app");

    expect(
      await screen.findByRole("heading", { level: 2, name: "File over app" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Steph Ango")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Files last" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/convert", expect.objectContaining({ method: "POST" }));
  });

  it("지우기를 누르면 입력값과 결과가 모두 사라진다", async () => {
    mockConvertResponse({
      ok: true,
      page: { url: "https://example.com/", title: "Example Domain", author: "", site: "", domain: "example.com", markdown: "본문" },
    });
    render(<Home />);
    await convert("https://example.com");
    await screen.findByRole("heading", { level: 2, name: "Example Domain" });

    fireEvent.click(screen.getByRole("button", { name: "지우기" }));

    expect(screen.getByLabelText("변환할 URL")).toHaveValue("");
    expect(screen.queryByRole("heading", { level: 2, name: "Example Domain" })).not.toBeInTheDocument();
  });

  it("변환에 실패하면 오류 메시지와 다시 시도 버튼을 보여준다", async () => {
    mockConvertResponse({ ok: false, error: "사이트가 요청을 거부했습니다 (HTTP 403)." }, 422);
    render(<Home />);

    await convert("https://news.hada.io/topic?id=1");

    expect(await screen.findByText("사이트가 요청을 거부했습니다 (HTTP 403).")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("직접 입력을 고르면 프롬프트 입력란이 나타난다", async () => {
    mockConvertResponse({
      ok: true,
      page: { url: "https://example.com/", title: "Example Domain", author: "", site: "", domain: "example.com", markdown: "본문" },
    });
    render(<Home />);
    await convert("https://example.com");
    await screen.findByRole("heading", { level: 2, name: "Example Domain" });

    expect(screen.queryByLabelText("직접 입력한 프롬프트")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "직접 입력" }));

    expect(screen.getByLabelText("직접 입력한 프롬프트")).toBeInTheDocument();
  });
});
