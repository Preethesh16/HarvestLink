import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { X, Volume2, Send, Square } from "lucide-react";
import { useLocale } from "./Locale";
const Bee = lazy(() => import("./Bee"));
export default function Assistant() {
  const { language, tr } = useLocale();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const revision = useRef(0);
  const voiceRevision = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    revision.current++;
    voiceRevision.current++;
    setAnswer("");
    setError("");
    audio.current?.pause();
    setSpeaking(false);
  }, [language]);
  useEffect(
    () => () => {
      revision.current++;
      voiceRevision.current++;
      audio.current?.pause();
    },
    [],
  );
  useEffect(() => {
    if (open) input.current?.focus();
    else {
      voiceRevision.current++;
      audio.current?.pause();
      setSpeaking(false);
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  async function ask(text: string) {
    if (busy) return;
    const version = revision.current;
    setBusy(true);
    setError("");
    audio.current?.pause();
    setSpeaking(false);
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, language }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.detail);
      if (version === revision.current) {
        setAnswer(d.text);
        setQuestion("");
      }
    } catch (e) {
      if (version === revision.current) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function speak() {
    const voiceVersion = ++voiceRevision.current;
    if (speaking) {
      audio.current?.pause();
      setSpeaking(false);
      return;
    }
    const version = revision.current;
    setSpeaking(true);
    setError("");
    try {
      const r = await fetch("/api/assistant/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: answer, language }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.detail);
      if (
        version !== revision.current ||
        voiceVersion !== voiceRevision.current
      )
        return;
      const player = new Audio(`data:${d.mime};base64,${d.audio}`);
      audio.current = player;
      player.onended = () => setSpeaking(false);
      await player.play();
    } catch (e) {
      if (voiceVersion === voiceRevision.current) {
        setError((e as Error).message);
        setSpeaking(false);
      }
    }
  }
  return (
    <aside className="bee-guide">
      {open && (
        <section className="bee-panel" aria-label={tr("Farmer assistant")}>
          <header>
            <div>
              <small>{tr("YOUR FARMING COMPANION")}</small>
              <h2>{tr("Hello, I’m Madhu.")}</h2>
            </div>
            <button
              aria-label={tr("Close assistant")}
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </header>
          <p>
            {tr(
              "Ask me how to use HarvestLink. You make every final decision.",
            )}
          </p>
          <div className="bee-suggestions">
            {[
              "How do I sell my harvest?",
              "How do I compare offers?",
              "When will I get paid?",
            ].map((q) => (
              <button disabled={busy} key={q} onClick={() => ask(q)}>
                {tr(q)}
              </button>
            ))}
          </div>
          {answer && (
            <div className="bee-answer" aria-live="polite">
              <p>{answer}</p>
              <button onClick={speak}>
                {speaking ? <Square size={16} /> : <Volume2 size={16} />}{" "}
                {tr(speaking ? "Stop voice" : "Listen in my language")}
              </button>
            </div>
          )}
          {error && <p role="alert">{tr(error)}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <input
              ref={input}
              aria-label={tr("Ask Madhu")}
              placeholder={tr("Type your question…")}
              value={question}
              maxLength={1000}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
            <button
              disabled={busy || !question.trim()}
              aria-label={tr("Send question")}
            >
              <Send size={18} />
            </button>
          </form>
          {busy && <p role="status">{tr("Madhu is thinking…")}</p>}
        </section>
      )}
      <button
        className="bee-toggle"
        aria-label={tr("Ask Madhu, your farmer assistant")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <div aria-hidden="true">
          <Suspense fallback={<span>🐝</span>}>
            <Bee />
          </Suspense>
        </div>
        <span>{tr("Ask Madhu")}</span>
      </button>
    </aside>
  );
}
