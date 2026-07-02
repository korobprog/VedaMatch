import Link from "next/link";
import { getMotivationPosts, type MotivationPost } from "@vedamatch/api-client";
import { LangSwitch } from "@/components/lang-switch";
import { RTL_LANGUAGES, normalizeLang, resolveApiBaseUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const lang = normalizeLang(params.lang);

  let posts: MotivationPost[] = [];
  try {
    const baseUrl = await resolveApiBaseUrl();
    const data = await getMotivationPosts(baseUrl, { lang, limit: 40 });
    posts = data.posts ?? [];
  } catch {
    posts = [];
  }

  const dir = RTL_LANGUAGES.has(lang) ? "rtl" : "ltr";

  return (
    <main className="container" dir={dir}>
      <header className="header">
        <div className="brand">
          Motivation<span>.</span>
        </div>
        <LangSwitch current={lang} basePath="/" />
      </header>

      {posts.length === 0 ? (
        <p className="empty">No motivational posts published yet. Check back soon. 🌱</p>
      ) : (
        <section className="grid">
          {posts.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}?lang=${lang}`} className="card">
              {post.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="card-image" src={post.imageUrl} alt={post.title || post.theme} />
              ) : (
                <div className="card-image" />
              )}
              <div className="card-body">
                {post.category ? (
                  <span className="category-badge" style={{ backgroundColor: post.category.color || undefined }}>
                    {post.category.name}
                  </span>
                ) : null}
                {post.title ? <h2 className="card-title">{post.title}</h2> : null}
                <p className="card-text">{post.text}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
