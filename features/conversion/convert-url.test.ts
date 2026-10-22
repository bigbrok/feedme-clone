// @vitest-environment node
import { describe, expect, it } from "vitest";

import { convertUrl } from "@/features/conversion";

const articleHtml = `<!doctype html>
<html><head>
  <title>File over app</title>
  <meta name="author" content="Steph Ango">
  <meta property="og:site_name" content="Steph Ango">
</head><body>
  <nav>Home About</nav>
  <article>
    <h1>File over app</h1>
    <p>File over app is a philosophy: if you want to create digital artifacts that last,
    they must be files you can control, in formats that are easy to retrieve and read.</p>
    <p>Use tools that give you this freedom. The files you create are more important
    than the tools you use to create them.</p>
  </article>
</body></html>`;

function fakeFetch(body: string, init: { status?: number; contentType?: string } = {}) {
  const calls: string[] = [];
  const fetchImpl = async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(body, {
      status: init.status ?? 200,
      headers: { "content-type": init.contentType ?? "text/html; charset=utf-8" },
    });
  };
  return { fetchImpl: fetchImpl as typeof fetch, calls };
}

describe("convertUrl", () => {
  it("기사 페이지를 제목·저자·Markdown 본문으로 변환한다", async () => {
    const { fetchImpl } = fakeFetch(articleHtml);

    const result = await convertUrl("https://stephango.com/file-over-app", { fetchImpl });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.page.title).toBe("File over app");
    expect(result.page.author).toBe("Steph Ango");
    expect(result.page.markdown).toContain("is a philosophy");
    expect(result.page.markdown).not.toContain("<p>");
  });

  it("스킴 없이 입력한 주소에 https://를 붙여 가져온다", async () => {
    const { fetchImpl, calls } = fakeFetch(articleHtml);

    const result = await convertUrl("  stephango.com/file-over-app ", { fetchImpl });

    expect(calls[0]).toBe("https://stephango.com/file-over-app");
    expect(result.ok && result.page.url).toBe("https://stephango.com/file-over-app");
  });

  it("URL 형식이 아닌 값은 가져오지 않고 오류를 돌려준다", async () => {
    const { fetchImpl, calls } = fakeFetch(articleHtml);

    const result = await convertUrl("그냥 문장입니다", { fetchImpl });

    expect(result).toEqual({ ok: false, error: expect.stringContaining("URL") });
    expect(calls).toHaveLength(0);
  });

  it("사이트가 요청을 거부하면 상태 코드를 담은 오류를 돌려준다", async () => {
    const { fetchImpl } = fakeFetch("Forbidden", { status: 403, contentType: "text/plain" });

    const result = await convertUrl("https://news.hada.io/topic?id=1", { fetchImpl });

    expect(result).toEqual({ ok: false, error: expect.stringContaining("403") });
  });

  it("HTML이 아닌 응답은 오류를 돌려준다", async () => {
    const { fetchImpl } = fakeFetch('{"a":1}', { contentType: "application/json" });

    const result = await convertUrl("https://example.com/data.json", { fetchImpl });

    expect(result.ok).toBe(false);
  });

  it("본문을 추출하지 못하면 오류를 돌려준다", async () => {
    const { fetchImpl } = fakeFetch("<!doctype html><html><head></head><body></body></html>");

    const result = await convertUrl("https://example.com/empty", { fetchImpl });

    expect(result.ok).toBe(false);
  });

  it("페이지를 가져오지 못하면 오류를 돌려준다", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    const result = await convertUrl("https://unreachable.invalid", { fetchImpl });

    expect(result.ok).toBe(false);
  });
});
