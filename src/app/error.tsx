"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="collection">
      <h1>The page slipped.</h1>
      <p>Give it a moment, then try opening it again.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
