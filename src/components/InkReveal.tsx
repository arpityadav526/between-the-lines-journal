"use client";
import { useEffect, useId, useState, type CSSProperties } from "react";
export function InkReveal({
  english,
  children,
}: {
  english?: string;
  children: React.ReactNode;
}) {
  const [displayed, setDisplayed] = useState<string>();
  const [phase, setPhase] = useState("idle");
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    if (english === undefined) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setPhase(reduced ? "reduced" : "bloom");
    const swap = window.setTimeout(
      () => {
        setDisplayed(english);
        setPhase(reduced ? "reduced" : "dry");
      },
      reduced ? 0 : 950,
    );
    const finish = window.setTimeout(
      () => setPhase("idle"),
      reduced ? 180 : 2100,
    );
    return () => {
      clearTimeout(swap);
      clearTimeout(finish);
    };
  }, [english]);
  return (
    <div className={"ink-page " + phase} aria-busy={phase !== "idle"}>
      {displayed === undefined ? (
        <div className="locked-art">{children}</div>
      ) : (
        <article className="paper reading-paper">
          <div className="page-top">
            <span>BETWEEN THE LINES</span>
            <span>THE STORY</span>
          </div>
          <div className="story-text" lang="en" aria-live="polite">
            {displayed.split("\n").map((line, i) => (
              <p key={i} style={{ "--line": Math.min(i, 8) } as CSSProperties}>
                {line || "\u00a0"}
              </p>
            ))}
          </div>
          <div className="page-end" aria-hidden="true">
            — ✳ —
          </div>
        </article>
      )}
      <div className="ink-bloom" aria-hidden="true">
        <svg viewBox="0 0 200 200" preserveAspectRatio="none">
          <defs>
            <filter id={id} x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency=".055"
                numOctaves="2"
                seed="12"
              />
              <feDisplacementMap in="SourceGraphic" scale="19" />
            </filter>
          </defs>
          <path
            filter={`url(#${id})`}
            fill="currentColor"
            d="M99 15C114 4 133 18 140 28C163 25 175 41 174 57C199 69 187 87 183 100C204 123 174 137 168 146C170 166 147 177 131 174C116 195 97 179 84 184C64 190 57 167 43 165C20 170 21 143 17 129C-1 111 17 96 15 80C6 56 29 48 39 43C44 16 67 28 79 20Z"
          />
        </svg>
      </div>
    </div>
  );
}
