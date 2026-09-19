import { SectionReader } from "@/components/SectionReader";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SectionReader key={id} id={id} />;
}
