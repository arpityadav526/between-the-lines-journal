"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, type Section } from "./api";
import { Lock } from "./Lock";
import { ChapterArt } from "./ChapterArt";
const descriptions = [
  "Where the story begins.",
  "The people in the margins.",
  "Lessons beyond the classroom.",
  "The turns I did not see coming.",
  "What I carry. What I let go.",
  "A few hopes for the pages ahead.",
];
export function Sections() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api<{ sections: Section[] }>("/api/sections")
      .then((data) => {
        if (active) setSections(data.sections);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/");
        else if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);
  return (
    <div className="collection">
      <div className="collection-heading">
        <div>
          <span className="eyebrow">THE TABLE OF CONTENTS</span>
          <h1>A life, in chapters.</h1>
          <p>Start anywhere. Stay as long as you like.</p>
        </div>
        <span className="chapter-count">
          {String(sections.filter((s) => s.unlocked).length).padStart(2, "0")} /{" "}
          {String(sections.length).padStart(2, "0")} <small>pages opened</small>
        </span>
      </div>
      <p role="status" className="message">
        {loading ? "Gathering the pages…" : error}
      </p>
      <div className="chapter-grid">
        {sections.map((section, index) => (
          <Link
            className="chapter-card paper"
            href={"/sections/" + section.id}
            key={section.id}
          >
            <div className="card-top">
              <span className="chapter-number">
                {String(section.order).padStart(2, "0")}
              </span>
              <span className="lock-label">
                <Lock open={section.unlocked} />
                {section.unlocked ? "OPENED" : "LOCKED"}
              </span>
            </div>
            <ChapterArt id={section.id} />
            <h2>{section.title}</h2>
            <p>{descriptions[index] ?? "Another page of the story."}</p>
            <div className="card-bottom">
              <span>
                {section.unlocked ? "Return to this chapter" : "Turn the page"}
              </span>
              <span aria-hidden="true">↗</span>
            </div>
          </Link>
        ))}
      </div>
      <p className="collection-footnote">
        A question opens each story. There is no hurry.
      </p>
    </div>
  );
}
