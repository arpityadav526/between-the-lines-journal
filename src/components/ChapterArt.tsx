import type { ReactNode } from "react";
const illustrations: Record<string, { label: string; drawing: ReactNode }> = {
  "chapter-1": {
    label: "A childhood swing beneath a tree",
    drawing: (
      <>
        <path d="M64 191V70m-19 18c-29-35 8-68 39-45 16-34 64-17 61 14 29 3 36 42 8 54H52" />
        <path d="M87 107v58m48-58v58M79 167h64l-7 9H85zM30 192h184" />
        <path d="M174 174c8-14 17-14 22 0m-12 17v-17" />
      </>
    ),
  },
  "chapter-2": {
    label: "A family home with a welcoming light",
    drawing: (
      <>
        <path d="M37 109 120 42l83 67M53 99v91h134V99M99 190v-57h42v57M68 112h20v25H68zm85 0h20v25h-20zM163 75V47h19v43" />
        <path d="M87 204h66M27 192h186M110 103c-15-10-2-25 10-12 12-13 25 2 10 12l-10 8z" />
      </>
    ),
  },
  "chapter-3": {
    label: "An open schoolbook and a pencil",
    drawing: (
      <>
        <path d="M120 83c-28-16-54-17-83-7v101c30-9 58-6 83 9 25-15 53-18 83-9V76c-29-10-55-9-83 7v103M48 189c27-6 49-2 72 10 23-12 45-16 72-10" />
        <path d="m153 47 30-27 11 12-31 27-18 6zM58 101l42 9m-42 13 42 9m-42 13 29 6m53-41 42-9m-42 31 42-9m-42 31 29-7" />
      </>
    ),
  },
  "chapter-4": {
    label: "A path reaching a turning point in the mountains",
    drawing: (
      <>
        <path d="M25 133 72 65l33 49 35-72 76 94M59 85l13 11 13-11m43-20 13 10 13-10M43 199c111-8 134-27 90-41-33-10-19-19 10-25" />
        <path d="M34 149h53m90 5h34M177 49a14 14 0 1 0-20-18" />
        <path d="m123 176 16 3-9 10" />
      </>
    ),
  },
  "chapter-5": {
    label: "A cracked bowl repaired with gold",
    drawing: (
      <>
        <path d="M43 103c4 55 29 83 77 83s73-28 77-83M43 103c28 12 126 12 154 0-21-16-134-16-154 0zM94 188h52" />
        <path
          className="art-repair"
          d="m105 110 14 18-11 20 17 17-6 20m-9-36-27 8m37-29 29-12"
        />
        <path d="m166 52-7 11 8 7m-90-19 5 9-9 7M32 199h176" />
      </>
    ),
  },
  "chapter-6": {
    label: "A paper boat sailing toward the stars",
    drawing: (
      <>
        <path d="m44 142 76 12 77-12-29 38H74zM63 144l63-77-6 87m6-87 42 81M30 194q15-10 30 0t30 0 30 0 30 0 30 0 30 0" />
        <path d="m175 41 4 11 12 4-12 4-4 11-4-11-12-4 12-4zM68 41v14m-7-7h14m70-22v10m-5-5h10" />
      </>
    ),
  },
};
export function ChapterArt({ id }: { id: string }) {
  const art = illustrations[id] ?? illustrations["chapter-6"];
  return (
    <svg
      className="chapter-art"
      viewBox="0 0 240 230"
      role="img"
      aria-label={art.label}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="120" cy="113" r="94" className="art-halo" stroke="none" />
      {art.drawing}
    </svg>
  );
}
