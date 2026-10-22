"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClipboardCopyIcon, DownloadIcon, ExternalLinkIcon, InfoIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ConvertedPage, ConvertResult } from "@/features/conversion";
import { toMarkdownFileName } from "@/features/export";
import { planLlmHandoff, type LlmTarget } from "@/features/llm-handoff";
import { PROMPT_PRESETS } from "@/features/prompt";

const CUSTOM_PROMPT = "직접 입력";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; page: ConvertedPage };

const TARGET_LABELS: Record<LlmTarget, string> = { chatgpt: "ChatGPT", claude: "Claude" };

export function Converter() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function convert() {
    setStatus({ kind: "loading" });
    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = (await response.json()) as ConvertResult;
      setStatus(result.ok ? { kind: "done", page: result.page } : { kind: "error", message: result.error });
    } catch {
      setStatus({ kind: "error", message: "변환 요청에 실패했습니다. 잠시 후 다시 시도해 주세요." });
    }
  }

  function reset() {
    setUrl("");
    setStatus({ kind: "idle" });
  }

  const loading = status.kind === "loading";

  return (
    <div className="flex flex-col gap-8">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading && url.trim()) void convert();
        }}
      >
        <div className="relative flex-1">
          <Input
            aria-label="변환할 URL"
            type="text"
            inputMode="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-10 pr-10"
          />
          {(url || status.kind !== "idle") && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="지우기"
              onClick={reset}
              className="absolute top-1/2 right-0.5 -translate-y-1/2"
            >
              <XIcon />
            </Button>
          )}
        </div>
        <Button type="submit" size="lg" disabled={loading || !url.trim()}>
          {loading ? "변환 중…" : "변환"}
        </Button>
      </form>

      {status.kind === "loading" && <ResultSkeleton />}
      {status.kind === "error" && (
        <Alert variant="destructive">
          <AlertTitle>변환하지 못했습니다</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={() => void convert()}>
              다시 시도
            </Button>
          </AlertAction>
        </Alert>
      )}
      {status.kind === "done" && <ConvertedResult page={status.page} />}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="변환 중">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function ConvertedResult({ page }: { page: ConvertedPage }) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [clipboardNotice, setClipboardNotice] = useState<LlmTarget | null>(null);

  const prompt = selectedPrompt === CUSTOM_PROMPT ? customPrompt : (selectedPrompt ?? "");
  const byline = [...new Set([page.author, page.site || page.domain].filter(Boolean))].join(" · ");

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(page.markdown);
      toast.success("Markdown을 복사했습니다.");
    } catch {
      toast.error("클립보드에 복사하지 못했습니다.");
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([page.markdown], { type: "text/markdown;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = toMarkdownFileName(page);
    link.click();
    URL.revokeObjectURL(href);
  }

  function openIn(target: LlmTarget) {
    const plan = planLlmHandoff({ target, prompt, markdown: page.markdown });
    if (plan.mode === "clipboard") {
      // Start the write before the new tab takes focus; browsers only allow it during the click.
      const copied = navigator.clipboard.writeText(plan.clipboardText);
      window.open(plan.url, "_blank", "noopener");
      copied.then(
        () => setClipboardNotice(target),
        () => toast.error("클립보드에 복사하지 못했습니다. 복사하기 버튼을 사용해 주세요."),
      );
      return;
    }
    setClipboardNotice(null);
    window.open(plan.url, "_blank", "noopener");
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance">
          {page.title || page.domain}
        </h2>
        {byline && <p className="text-sm text-muted-foreground">{byline}</p>}
      </header>

      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void copyMarkdown()}>
            <ClipboardCopyIcon data-icon="inline-start" />
            복사하기
          </Button>
          <Button variant="outline" onClick={downloadMarkdown}>
            <DownloadIcon data-icon="inline-start" />
            .md 다운로드
          </Button>
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">LLM으로 열기</p>
          <ToggleGroup
            variant="outline"
            size="sm"
            className="flex-wrap"
            aria-label="프롬프트"
            value={selectedPrompt ? [selectedPrompt] : []}
            onValueChange={(value: string[]) => setSelectedPrompt(value[0] ?? null)}
          >
            {[...PROMPT_PRESETS, CUSTOM_PROMPT].map((preset) => (
              <ToggleGroupItem key={preset} value={preset}>
                {preset}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {selectedPrompt === CUSTOM_PROMPT && (
            <Input
              aria-label="직접 입력한 프롬프트"
              placeholder="예: 핵심 주장 세 가지만 뽑아줘"
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              autoFocus
            />
          )}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TARGET_LABELS) as LlmTarget[]).map((target) => (
              <Button key={target} onClick={() => openIn(target)}>
                <ExternalLinkIcon data-icon="inline-start" />
                {TARGET_LABELS[target]}로 열기
              </Button>
            ))}
          </div>
          {clipboardNotice && (
            <Alert>
              <InfoIcon />
              <AlertTitle>클립보드에 복사했습니다</AlertTitle>
              <AlertDescription>
                본문이 길어서 {TARGET_LABELS[clipboardNotice]} 입력창에 바로 넣지 못했습니다. 새 탭의 입력창에
                붙여넣으세요.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <article className="prose max-w-none dark:prose-invert prose-headings:font-heading prose-pre:overflow-x-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.markdown}</ReactMarkdown>
      </article>
    </section>
  );
}
