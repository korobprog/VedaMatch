const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#101820"/>
  <path d="M18 18h8l6 18 6-18h8L36 46h-8L18 18Z" fill="#f7c948"/>
  <circle cx="46" cy="42" r="5" fill="#4fd1c5"/>
</svg>`;

export const dynamic = "force-static";

export function GET() {
  return new Response(FAVICON_SVG, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
