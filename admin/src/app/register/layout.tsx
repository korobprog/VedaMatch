import { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams: { inviteCode?: string } }): Promise<Metadata> {
    const inviteCode = searchParams.inviteCode;

    if (inviteCode) {
        return {
            title: `Вас пригласили в VedaMatch! Код: ${inviteCode}`,
            description: 'Зарегистрируйтесь по приглашению и получите 50 LKM приветственного бонуса.',
            openGraph: {
                title: 'Присоединяйся к VedaMatch',
                description: `Вас пригласили! Используйте код ${inviteCode} при регистрации.`,
                type: 'website',
                url: `https://vedamatch.ru/register?inviteCode=${inviteCode}`,
                images: [
                    {
                        url: 'https://vedamatch.ru/assets/invite_banner.png',
                        width: 1200,
                        height: 630,
                        alt: 'Join VedaMatch Sangha',
                    }
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title: 'Присоединяйся к VedaMatch',
                description: `Вас пригласили! Используйте код ${inviteCode} при регистрации.`,
                images: ['https://vedamatch.ru/assets/invite_banner.png'],
            }
        };
    }

    return {
        title: 'Регистрация | VedaMatch',
        description: 'Создайте аккаунт в VedaMatch и станьте частью нашей Сангхи.',
    };
}

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
