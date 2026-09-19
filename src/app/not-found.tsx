import Link from "next/link";
export default function NotFound() {
  return (
    <div className="collection">
      <span className="eyebrow">A MISSING PAGE</span>
      <h1>This chapter isn’t here.</h1>
      <Link href="/sections">Return to the journal →</Link>
    </div>
  );
}
