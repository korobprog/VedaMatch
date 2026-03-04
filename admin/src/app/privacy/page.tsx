import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | VedaMatch',
  description: 'Публичная политика конфиденциальности сервиса VedaMatch.',
  alternates: {
    canonical: 'https://vedamatch.ru/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-[var(--foreground)]">
      <h1 className="mb-2 text-3xl font-bold">Политика конфиденциальности VedaMatch</h1>
      <p className="mb-8 text-sm text-[var(--muted-foreground)]">Дата обновления: 04.03.2026</p>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">1. Оператор и контакты</h2>
        <p>Сервис VedaMatch обрабатывает персональные данные в рамках применимого законодательства.</p>
        <p>
          Контакт по вопросам приватности:{' '}
          <a className="underline" href="mailto:privacy@vedamatch.ru">privacy@vedamatch.ru</a>
        </p>
        <p>
          Общая поддержка:{' '}
          <a className="underline" href="mailto:support@vedamatch.ru">support@vedamatch.ru</a>
        </p>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">2. Какие данные обрабатываются</h2>
        <p>
          Мы можем обрабатывать данные аккаунта (email и профиль), пользовательский контент
          (сообщения и медиа), технические данные (идентификаторы устройства/сессии), а также
          геолокацию только при включении соответствующих функций.
        </p>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">3. Цели обработки</h2>
        <p>
          Данные используются для авторизации, работы функций сообщений и медиа, отправки уведомлений,
          предотвращения злоупотреблений, повышения стабильности сервиса и оказания поддержки.
        </p>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">4. Положение о LKM</h2>
        <p>LKM являются внутренними неплатежными баллами активности внутри приложения.</p>
        <p>LKM не являются законным платежным средством, электронными деньгами или платежным инструментом.</p>
        <p>LKM нельзя обменять, вывести или конвертировать в деньги/крипто вне приложения.</p>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">5. Удаление аккаунта</h2>
        <p>Удаление доступно в приложении: Settings - Delete account.</p>
        <p>Также доступна публичная страница: <a className="underline" href="https://vedamatch.ru/delete-account">https://vedamatch.ru/delete-account</a></p>
        <p>
          После удаления активные сессии отзываются, а персональные данные удаляются или анонимизируются
          согласно установленным срокам хранения.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Сроки хранения</h2>
        <p>Базовые сроки: аккаунт до 30 дней, медиа до 30 дней, технические логи до 365 дней.</p>
        <p>Данные, необходимые для исполнения обязательств по закону, могут храниться до 1825 дней.</p>
      </section>
    </main>
  );
}
