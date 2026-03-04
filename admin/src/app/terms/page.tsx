import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Условия использования | VedaMatch',
  description: 'Публичные условия использования сервиса VedaMatch.',
  alternates: {
    canonical: 'https://vedamatch.ru/terms',
  },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-[var(--foreground)]">
      <h1 className="mb-2 text-3xl font-bold">Условия использования VedaMatch</h1>
      <p className="mb-8 text-sm text-[var(--muted-foreground)]">Дата обновления: 04.03.2026</p>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">1. Принятие условий</h2>
        <p>
          Используя VedaMatch, вы подтверждаете согласие с настоящими Условиями. Если вы не согласны с
          условиями, пожалуйста, прекратите использование сервиса.
        </p>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">2. Статус оператора</h2>
        <p>Сервис в текущей версии управляется оператором в рамках действующего законодательства РФ.</p>
        <p>
          При изменении модели оператора и/или юрисдикции актуальная редакция Условий публикуется заранее
          с новой датой вступления в силу.
        </p>
        <p>
          Юридический контакт: <a className="underline" href="mailto:legal@vedamatch.ru">legal@vedamatch.ru</a>
        </p>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">3. Правила использования</h2>
        <p>
          Пользователь обязуется не размещать незаконный, оскорбительный, мошеннический или нарушающий
          права третьих лиц контент.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Насилие, угрозы, призывы к причинению вреда.</li>
          <li>Оскорбления, harassment, hate speech и дискриминация.</li>
          <li>Сексуальная эксплуатация и любой контент с участием несовершеннолетних.</li>
          <li>Мошенничество, фишинг, спам и вводящие в заблуждение схемы.</li>
          <li>Продажа/продвижение незаконных товаров и услуг.</li>
          <li>Имперсонация, нарушение авторских и иных прав третьих лиц.</li>
        </ul>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">4. Модерация и ограничения</h2>
        <p>
          Сервис вправе удалять контент и ограничивать доступ к аккаунту при нарушении закона,
          настоящих Условий или правил модерации.
        </p>
        <p>
          В зависимости от тяжести нарушения сервис вправе применить удаление материалов, ограничение
          функциональности, временную или постоянную блокировку аккаунта.
        </p>
        <p>
          При наличии законных оснований сведения о нарушении могут быть переданы компетентным органам.
        </p>
      </section>

      <section className="mb-6 space-y-3">
        <h2 className="text-xl font-semibold">5. Положение о LKM</h2>
        <p>LKM — внутренние неплатежные баллы, используемые только внутри приложения.</p>
        <p>LKM не являются законным платежным средством, электронными деньгами или платежным инструментом.</p>
        <p>LKM нельзя обменять, вывести или погасить в денежные средства.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Контакты</h2>
        <p>
          По юридическим вопросам: <a className="underline" href="mailto:legal@vedamatch.ru">legal@vedamatch.ru</a>
        </p>
        <p>
          По вопросам поддержки: <a className="underline" href="mailto:support@vedamatch.ru">support@vedamatch.ru</a>
        </p>
      </section>
    </main>
  );
}
