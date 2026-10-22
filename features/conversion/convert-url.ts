import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";

export type ConvertedPage = {
  url: string;
  title: string;
  author: string;
  site: string;
  domain: string;
  markdown: string;
};

export type ConvertResult =
  | { ok: true; page: ConvertedPage }
  | { ok: false; error: string };

type Options = { fetchImpl?: typeof fetch };

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function convertUrl(
  input: string,
  { fetchImpl = fetch }: Options = {},
): Promise<ConvertResult> {
  const url = normalizeUrl(input);
  if (!url) {
    return { ok: false, error: "올바른 URL을 입력해 주세요." };
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
      redirect: "follow",
    });
  } catch {
    return { ok: false, error: "페이지에 연결할 수 없습니다. 주소를 확인해 주세요." };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `사이트가 요청을 거부했습니다 (HTTP ${response.status}).`,
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    return { ok: false, error: "HTML 페이지가 아니라 변환할 수 없습니다." };
  }

  const html = await response.text();
  // linkedom throws on documents without an <html> root, so treat that as no content.
  const result = await Defuddle(parseHTML(html).document, url, { markdown: true }).catch(
    () => null,
  );

  if (!result || !result.content?.trim()) {
    return { ok: false, error: "페이지에서 본문을 찾지 못했습니다." };
  }

  return {
    ok: true,
    page: {
      url,
      title: result.title ?? "",
      author: result.author ?? "",
      site: result.site ?? "",
      domain: result.domain ?? "",
      markdown: result.content ?? "",
    },
  };
}
