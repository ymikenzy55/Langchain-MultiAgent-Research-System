"use client";

import { useState } from "react";

interface ResearchResult {
  search_result: string;
  scraped_content: string;
  report: string;
  feedback: string;
}

type StepKey = "search" | "scrape" | "write" | "critic";

interface ActiveStatus {
  step: StepKey;
  message: string;
}

const STEPS: { key: StepKey; label: string; field: keyof ResearchResult; desc: string }[] = [
  { key: "search", label: "Search Results", field: "search_result", desc: "Raw data gathered from the web" },
  { key: "scrape", label: "Scraped Content", field: "scraped_content", desc: "Deep content extracted from top source" },
  { key: "write", label: "Research Report", field: "report", desc: "Structured report written by the AI" },
  { key: "critic", label: "Critic Review", field: "feedback", desc: "Quality score and feedback" },
];

const STEP_LABELS: Record<StepKey, string> = {
  search: "Search Agent",
  scrape: "Reader Agent",
  write: "Writer Agent",
  critic: "Critic Agent",
};

const STEP_ORDER: StepKey[] = ["search", "scrape", "write", "critic"];

const SUGGESTED = [
  "The impact of AI on the job market in 2026",
  "Quantum computing breakthroughs in 2025",
  "Climate change solutions being deployed today",
  "The future of electric vehicles",
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState<StepKey>("write");
  const [status, setStatus] = useState<ActiveStatus | null>(null);
  const [completedSteps, setCompletedSteps] = useState<StepKey[]>([]);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    setStatus(null);
    setCompletedSteps([]);

    try {
      const res = await fetch("http://localhost:8080/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Something went wrong");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentStep: StepKey | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const parsed = JSON.parse(line.slice(6));

          if (parsed.type === "progress") {
            const step = parsed.step as StepKey;
            if (currentStep && currentStep !== step) {
              setCompletedSteps((prev) => [...prev, currentStep!]);
            }
            currentStep = step;
            setStatus({ step, message: parsed.message });
          } else if (parsed.type === "result") {
            if (currentStep) setCompletedSteps(STEP_ORDER);
            setStatus(null);
            setResult(parsed.data);
            setActiveStep("write");
          } else if (parsed.type === "error") {
            throw new Error(parsed.message);
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result) return;
    const activeField = STEPS.find((s) => s.key === activeStep)?.field;
    if (activeField) {
      navigator.clipboard.writeText(result[activeField]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDownload() {
    if (!result) return;
    const content = `RESEARCH REPORT\nTopic: ${topic}\n\n${"=".repeat(60)}\n\nREPORT\n${result.report}\n\n${"=".repeat(60)}\n\nCRITIC FEEDBACK\n${result.feedback}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-${topic.slice(0, 30).replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setResult(null);
    setTopic("");
    setStatus(null);
    setCompletedSteps([]);
    setError("");
  }

  const activeContent = result ? result[STEPS.find((s) => s.key === activeStep)!.field] : "";
  const wordCount = activeContent ? activeContent.trim().split(/\s+/).length : 0;

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 sticky top-0 bg-white z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.346A3.5 3.5 0 0114.5 20.5h-5a3.5 3.5 0 01-2.468-1.024l-.347-.346z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-black tracking-tight leading-none">Research Agent</h1>
              <p className="text-xs text-gray-400 mt-0.5">Multi-agent AI research system</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-black border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                New Research
              </button>
            )}
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              Powered by Groq
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Hero — only show when no result and not loading */}
        {!result && !loading && (
          <div className="mb-10">
            <div className="mb-1">
              <span className="text-xs font-medium text-green-600 uppercase tracking-widest">AI Research System</span>
            </div>
            <h2 className="text-4xl font-bold text-black tracking-tight leading-tight mb-3">
              Research anything,<br />instantly.
            </h2>
            <p className="text-gray-400 text-sm max-w-lg">
              Four specialized agents work in sequence — searching, scraping, writing, and reviewing — to deliver structured research on any topic.
            </p>
          </div>
        )}

        {/* Search Form */}
        {!result && (
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Enter a research topic..."
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm text-black placeholder-gray-300 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="px-7 py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-green-200 text-white text-sm font-semibold rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Research
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Suggested Topics */}
        {!result && !loading && (
          <div className="mb-10">
            <p className="text-xs text-gray-400 mb-2">Suggested topics</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => setTopic(s)}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-full text-gray-500 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        {!result && !loading && (
          <div className="grid grid-cols-4 gap-4 mb-10">
            {[
              { step: "01", label: "Search Agent", desc: "Scans the web for relevant sources" },
              { step: "02", label: "Reader Agent", desc: "Scrapes and extracts deep content" },
              { step: "03", label: "Writer Agent", desc: "Drafts a structured report" },
              { step: "04", label: "Critic Agent", desc: "Reviews and scores the output" },
            ].map((item) => (
              <div key={item.step} className="border border-gray-100 rounded-xl p-4">
                <span className="text-xs font-bold text-green-600">{item.step}</span>
                <p className="text-sm font-semibold text-black mt-1">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-red-200 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700 mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Pipeline Progress */}
        {loading && (
          <div className="border border-gray-100 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm font-semibold text-black">Running pipeline</p>
              <span className="text-xs text-gray-400">{topic}</span>
            </div>

            {/* Step tracker */}
            <div className="flex items-center gap-0 mb-6">
              {STEP_ORDER.map((key, i) => {
                const done = completedSteps.includes(key);
                const active = status?.step === key;
                const pending = !done && !active;
                return (
                  <div key={key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        done ? "bg-green-600 border-green-600" :
                        active ? "border-green-600 bg-white" :
                        "border-gray-200 bg-white"
                      }`}>
                        {done ? (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : active ? (
                          <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-200" />
                        )}
                      </div>
                      <span className={`text-xs mt-1.5 font-medium ${done || active ? "text-black" : "text-gray-300"}`}>
                        {STEP_LABELS[key]}
                      </span>
                    </div>
                    {i < STEP_ORDER.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-5 mx-1 ${done ? "bg-green-500" : "bg-gray-100"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Current status message */}
            {status && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <p className="text-sm text-green-800">{status.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Result header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Research complete</p>
                <h2 className="text-lg font-bold text-black">{topic}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black border border-gray-200 hover:border-gray-400 px-3 py-2 rounded-lg transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg transition cursor-pointer font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 border-b border-gray-100">
              {STEPS.map((step) => (
                <button
                  key={step.key}
                  onClick={() => setActiveStep(step.key)}
                  className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px cursor-pointer ${
                    activeStep === step.key
                      ? "border-green-600 text-green-700"
                      : "border-transparent text-gray-400 hover:text-black"
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {STEPS.map(
              (step) =>
                activeStep === step.key && (
                  <div key={step.key}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-400">{step.desc}</p>
                      <span className="text-xs text-gray-300">{wordCount} words</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-black leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-6 max-h-[600px] overflow-y-auto font-sans">
                      {result[step.field] || "No content available."}
                    </pre>
                  </div>
                )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
