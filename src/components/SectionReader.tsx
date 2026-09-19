"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, type Section } from "./api";
import { InkReveal } from "./InkReveal";
import { Lock } from "./Lock";
export function SectionReader({ id }: { id: string }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>();
  const [german, setGerman] = useState("");
  const [english, setEnglish] = useState<string>();
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [list, preview] = await Promise.all([
          api<{ sections: Section[] }>("/api/sections"),
          api<{ text_de: string }>(`/api/sections/${id}/preview`),
        ]);
        if (!active) return;
        const found = list.sections.find((s) => s.id === id);
        if (!found) throw Error("This page was not found.");
        setSection(found);
        setGerman(preview.text_de);
        if (found.unlocked) {
          const data = await api<{ text_en: string }>("/api/unlock", {
            sectionId: id,
          });
          if (active) {
            setEnglish(data.text_en);
            setLanguage("en");
          }
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace("/");
        else if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, router]);
  useEffect(() => {
    if (!waitUntil) return;
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((waitUntil - Date.now()) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [waitUntil]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const answer = new FormData(event.currentTarget).get("answer");
    try {
      const data = await api<{ text_en: string }>("/api/unlock", {
        sectionId: id,
        answer,
      });
      setSection((s) => (s ? { ...s, unlocked: true } : s));
      setEnglish(data.text_en);
      setLanguage("en");
    } catch (e) {
      setError((e as Error).message);
      setWrong((w) => w + 1);
      if (e instanceof ApiError && e.retryAfter)
        setWaitUntil(Date.now() + e.retryAfter * 1000);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="reader">
      <nav className="reader-nav">
        <Link href="/sections">← All chapters</Link>
        <span>A PAGE FROM MY LIFE</span>
      </nav>
      <article className="paper reading-paper">
        <div className="page-top">
          <span>CHAPTER {String(section?.order ?? 0).padStart(2, "0")}</span>
          <span>{language === "de" ? "DEUTSCH" : "ENGLISH"}</span>
        </div>
        <h1>{section?.title ?? "Opening the page…"}</h1>
        <div className="small-rule" />
        {german && (
          <InkReveal german={german} english={english} language={language} />
        )}
        <div className="page-end" aria-hidden="true">
          — ✳ —
        </div>
      </article>
      {section && (
        <section className="question-card">
          <div className="question-heading">
            <Lock open={section.unlocked} />
            <span>
              {section.unlocked
                ? "A LITTLE CLOSER NOW"
                : "A SMALL QUESTION, BEFORE THE TRANSLATION"}
            </span>
          </div>
          {english ? (
            <div className="language-options" aria-label="Story language">
              <button
                aria-pressed={language === "de"}
                onClick={() => setLanguage("de")}
              >
                Original (Deutsch)
              </button>
              <span>/</span>
              <button
                aria-pressed={language === "en"}
                onClick={() => setLanguage("en")}
              >
                English
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label htmlFor="answer">{section.question}</label>
              {section.hint && (
                <p className="hint">A little hint: {section.hint}</p>
              )}
              <div className="entry-row">
                <input
                  key={wrong}
                  className={wrong ? "wrong-answer" : ""}
                  id="answer"
                  name="answer"
                  placeholder="Your answer"
                  maxLength={300}
                  required
                  autoComplete="off"
                  aria-describedby="answer-status"
                />
                <button disabled={busy || remaining > 0}>
                  {busy ? "Listening…" : "Let the ink unfold"}{" "}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </form>
          )}
        </section>
      )}
      <p role="status" id="answer-status" className="message">
        {error}
        {remaining > 0
          ? ` Try again in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}.`
          : ""}
      </p>
    </div>
  );
}
