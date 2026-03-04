import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Удаление аккаунта | VedaMatch',
  description: 'Публичная инструкция по удалению аккаунта VedaMatch.',
  alternates: {
    canonical: 'https://vedamatch.ru/delete-account',
  },
};

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-[var(--foreground)]">
      <h1 className="mb-2 text-3xl font-bold">Удаление аккаунта VedaMatch</h1>
      <p className="mb-8 text-sm text-[var(--muted-foreground)]">Дата обновления: 04.03.2026</p>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">1. Как удалить аккаунт в приложении</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Откройте VedaMatch и перейдите в Settings.</li>
          <li>Нажмите кнопку Delete account.</li>
          <li>Подтвердите удаление аккаунта в диалоге подтверждения.</li>
        </ol>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">2. Что происходит после удаления</h2>
        <p>Аккаунт деактивируется, активные сессии отзываются, доступ к сервису прекращается.</p>
        <p>
          Персональные данные удаляются или анонимизируются согласно политике хранения и требованиям
          законодательства.
        </p>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">3. Сроки удаления и хранения</h2>
        <p>Базовые сроки обработки удаления: до 30 дней с момента подтверждения запроса.</p>
        <p>Технические логи могут храниться до 365 дней для обеспечения безопасности и устойчивости сервиса.</p>
        <p>Данные, подлежащие хранению по закону, могут храниться до 1825 дней.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Контакты</h2>
        <p>
          По запросам на удаление и приватность:{' '}
          <a className="underline" href="mailto:privacy@vedamatch.ru">privacy@vedamatch.ru</a>
        </p>
        <p>
          Общая поддержка:{' '}
          <a className="underline" href="mailto:support@vedamatch.ru">support@vedamatch.ru</a>
        </p>
      </section>
    </main>
  );
}
