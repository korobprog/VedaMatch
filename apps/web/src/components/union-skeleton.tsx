type UnionSkeletonVariant = "cards" | "list" | "form";

const COUNTS: Record<UnionSkeletonVariant, number> = {
  cards: 6,
  list: 4,
  form: 8,
};

/**
 * Скелетоны загрузки вместо текста «Loading».
 * Чисто презентационные плейсхолдеры, скрытые от скринридеров;
 * статус загрузки сообщается отдельным aria-live регионом вызывающего.
 */
export function UnionSkeleton({ variant, count }: { variant: UnionSkeletonVariant; count?: number }) {
  const items = Array.from({ length: count ?? COUNTS[variant] });
  return (
    <div className={`union-skeleton union-skeleton--${variant}`} aria-hidden="true">
      {items.map((_, index) => (
        <div className={`union-skeleton__item union-skeleton__item--${variant}`} key={index}>
          {variant === "cards" ? (
            <>
              <div className="union-skeleton__media" />
              <div className="union-skeleton__line union-skeleton__line--title" />
              <div className="union-skeleton__line" />
              <div className="union-skeleton__line union-skeleton__line--short" />
            </>
          ) : (
            <>
              <div className="union-skeleton__line union-skeleton__line--title" />
              <div className="union-skeleton__line" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
