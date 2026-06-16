import type { DatingCandidate, UserMedia } from "@vedamatch/domain-types";

/**
 * Общие утилиты Union, ранее продублированные в
 * `union-dashboard`, `union-profile-form` и `union-public-home`.
 */

/** Идентификатор анкеты кандидата (бэкенд отдаёт то `ID`, то `id`). */
export function getProfileId(candidate: DatingCandidate | null | undefined): number {
  return candidate?.ID || candidate?.id || 0;
}

/** Идентификатор медиа-файла пользователя (бэкенд отдаёт то `ID`, то `id`). */
export function getMediaId(photo: UserMedia): number {
  return photo.ID || photo.id || 0;
}

/** Первое доступное фото кандидата (массив строк, объектов или avatarUrl). */
export function getCandidatePhoto(candidate: DatingCandidate): string {
  const firstPhoto = candidate.photos?.[0];
  if (typeof firstPhoto === "string") {
    return firstPhoto;
  }
  return candidate.avatarUrl || candidate.avatar_url || firstPhoto?.url || "";
}

/** Приводит произвольное значение анкеты к строке для отображения. */
export function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

/**
 * Достраивает абсолютный URL медиа от origin сервера (без префикса `/api`).
 * Голые имена файлов трактуются как аватары в `/uploads/avatars`.
 * Используется на публичной поверхности; см. также `resolveApiMediaUrl`.
 */
export function resolveMediaUrl(baseUrl: string, value?: string | null): string {
  const url = String(value || "").trim();
  if (!url) {
    return "";
  }
  if (/^(https?:|data:|blob:)/.test(url)) {
    return url;
  }

  const origin = baseUrl.replace(/\/api(?:\/.*)?$/, "");
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  if (/^\/[^/]+\.(?:jpg|jpeg|png|webp|gif|heic|heif)$/i.test(normalizedPath)) {
    return `${origin}/uploads/avatars${normalizedPath}`;
  }
  return `${origin}${normalizedPath}`;
}

/**
 * Достраивает URL медиа относительно `client.baseUrl` (включая `/api`).
 * Сохраняет историческое поведение редактора анкеты: пути, которые сервер
 * уже отдал как абсолютные (`/uploads/...`), резолвятся от API-базы.
 */
export function resolveApiMediaUrl(baseUrl: string, value?: string | null): string {
  const url = String(value || "").trim();
  if (!url) {
    return "";
  }
  if (/^(https?:|data:|blob:)/.test(url)) {
    return url;
  }
  return `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}
