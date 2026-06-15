import { ReaderView } from "@/components/reader-view";

export default async function ReadPage({ params }: { params: Promise<{ bookCode: string }> }) {
  const { bookCode } = await params;
  return <ReaderView bookCode={bookCode} />;
}
