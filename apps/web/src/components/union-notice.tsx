import { CheckCircle2, AlertCircle } from "lucide-react";

type UnionNoticeTone = "success" | "error";

/**
 * Статусное сообщение Union с явной семантикой и иконкой.
 * Раньше ошибка и успех делили общий класс `.notice` и выглядели одинаково.
 */
export function UnionNotice({ tone, children }: { tone: UnionNoticeTone; children: React.ReactNode }) {
  if (!children) {
    return null;
  }
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`notice notice--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden="true" size={18} />
      <span>{children}</span>
    </div>
  );
}
