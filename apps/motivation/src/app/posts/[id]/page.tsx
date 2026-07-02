import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMotivationPost, type MotivationPost } from "@vedamatch/api-client";
import { LangSwitch } from "@/components/lang-switch";
import { RTL_LANGUAGES, normalizeLang, resolveApiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

async function loadPost(id: string, lang: string): Promise<MotivationPost | null> {
  const numId = Number.parseInt(id, 10);
  if (!Number.isFinite(numId) || numId <= 0) return null;
  try {
    const baseUrl = await resolveApiBaseUrl();
    return await getMotivationPost(baseUrl, numId, lang);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const lang = normalizeLang(sp.lang);
  const post = await loadPost(id, lang);
  if (!post) return { title: "Motivation — VedaMatch" };
  return {
    title: post.title ? `${post.title} — Motivation` : "Motivation — VedaMatch",
    description: post.text?.slice(0, 160),
    openGraph: {
      title: post.title || "Motivation",
      description: post.text?.slice(0, 160),
      images: post.imageUrl ? [{ url: post.imageUrl }] : undefined,
    },
  };
}

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const lang = normalizeLang(sp.lang);
  const post = await loadPost(id, lang);
  if (!post) notFound();

  const dir = RTL_LANGUAGES.has(lang) ? "rtl" : "ltr";

  return (
    <main className="container" dir={dir}>
      <header className="header">
        <div className="brand">
          Motivation<span>.</span>
        </div>
        <LangSwitch current={lang} basePath={`/posts/${post.id}`} />
      </header>

      <article className="detail">
        <Link href={`/?lang=${lang}`} className="back">
          ← All posts
        </Link>
        {post.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt={post.title || post.theme} />
        ) : null}
        {post.category ? (
          <span className="category-badge" style={{ backgroundColor: post.category.color || undefined }}>
            {post.category.name}
          </span>
        ) : null}
        {post.title ? <h1>{post.title}</h1> : null}
        <p className="card-text" style={{ fontSize: 18 }}>
          {post.text}
        </p>
      </article>
    </main>
  );
}
