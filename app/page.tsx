import { Converter } from "@/app/_components/converter";
import { ThemeToggle } from "@/app/_components/theme-toggle";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Feedme</h1>
          <p className="text-muted-foreground">
            웹 페이지 URL을 Markdown으로 바꿔 ChatGPT나 Claude로 바로 넘깁니다.
          </p>
        </div>
        <ThemeToggle />
      </header>
      <main>
        <Converter />
      </main>
    </div>
  );
}
