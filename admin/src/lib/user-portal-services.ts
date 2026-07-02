export type PortalServiceId =
    | 'contacts'
    | 'chat'
    | 'calls'
    | 'services'
    | 'dating'
    | 'cafe'
    | 'shops'
    | 'ads'
    | 'library'
    | 'bookmarks'
    | 'education'
    | 'news'
    | 'map'
    | 'ai-models';

export interface UserPortalService {
    id: PortalServiceId;
    label: string;
    path: string;
    color: string;
    description: string;
    keywords: string[];
    section: 'communication' | 'community' | 'marketplace' | 'knowledge' | 'tools';
}

export type UserPortalLayout = {
    version: 1;
    order: PortalServiceId[];
    hidden: PortalServiceId[];
};

export const USER_PORTAL_SERVICES: UserPortalService[] = [
    {
        id: 'contacts',
        label: 'Контакты',
        color: 'bg-blue-600',
        path: '/contacts',
        description: 'Ваши друзья, заявки рядом по душе, поиск и социальные связи.',
        keywords: ['люди', 'пользователи', 'друзья', 'заявки', 'контакты'],
        section: 'communication',
    },
    {
        id: 'chat',
        label: 'Чат',
        color: 'bg-[#4a3e36]',
        path: '/chat',
        description: 'Личные диалоги и переписка внутри портала.',
        keywords: ['сообщения', 'диалоги', 'чат', 'переписка'],
        section: 'communication',
    },
    {
        id: 'calls',
        label: 'Звонки',
        color: 'bg-emerald-600',
        path: '/calls',
        description: 'Аудио и видео связь.',
        keywords: ['звонок', 'голос', 'видео', 'связь'],
        section: 'communication',
    },
    {
        id: 'services',
        label: 'Сервисы',
        color: 'bg-gradient-to-br from-amber-500 to-orange-600',
        path: '/services',
        description: 'Каталог услуг, помощников, разделов и функций VedaMatch.',
        keywords: ['услуги', 'помощники', 'сервисы', 'разделы', 'настройки'],
        section: 'tools',
    },
    {
        id: 'dating',
        label: 'Союз',
        color: 'bg-pink-600',
        path: '/dating',
        description: 'Поиск спутника и духовной пары.',
        keywords: ['союз', 'знакомства', 'пара', 'отношения'],
        section: 'community',
    },
    {
        id: 'cafe',
        label: 'Кафе',
        color: 'bg-orange-700',
        path: '/cafe',
        description: 'Вегетарианское меню, кафе и заказы.',
        keywords: ['еда', 'кафе', 'прасад', 'ресторан', 'заказы'],
        section: 'marketplace',
    },
    {
        id: 'shops',
        label: 'Магазины',
        color: 'bg-[#b8632c]',
        path: '/shops',
        description: 'Духовные товары, книги и покупки.',
        keywords: ['товары', 'книги', 'покупки', 'магазин', 'маркет'],
        section: 'marketplace',
    },
    {
        id: 'ads',
        label: 'Объявления',
        color: 'bg-red-600',
        path: '/ads',
        description: 'Объявления и предложения сообщества.',
        keywords: ['доска', 'объявления', 'предложения', 'маркет'],
        section: 'marketplace',
    },
    {
        id: 'library',
        label: 'Библиотека',
        color: 'bg-green-700',
        path: '/library',
        description: 'Духовные книги и материалы для чтения.',
        keywords: ['книги', 'чтение', 'шастры', 'тексты'],
        section: 'knowledge',
    },
    {
        id: 'bookmarks',
        label: 'Закладки',
        color: 'bg-orange-600',
        path: '/library/bookmarks',
        description: 'Сохраненные материалы библиотеки.',
        keywords: ['закладки', 'сохраненное', 'книги', 'чтение'],
        section: 'knowledge',
    },
    {
        id: 'education',
        label: 'Обучение',
        color: 'bg-violet-600',
        path: '/education',
        description: 'Курсы, лекции и наставники.',
        keywords: ['курсы', 'лекции', 'обучение', 'знания'],
        section: 'knowledge',
    },
    {
        id: 'news',
        label: 'Новости',
        color: 'bg-[#5c4d47]',
        path: '/news',
        description: 'Новости сообщества и важные события.',
        keywords: ['новости', 'события', 'лента', 'статьи'],
        section: 'community',
    },
    {
        id: 'map',
        label: 'Карта',
        color: 'bg-indigo-700',
        path: '/map',
        description: 'Карта мест, храмов и точек сообщества.',
        keywords: ['карта', 'места', 'храм', 'точки', 'локации'],
        section: 'tools',
    },
    {
        id: 'ai-models',
        label: 'VedaMatch',
        color: 'bg-gradient-to-br from-orange-500 to-red-600',
        path: '/ai-models',
        description: 'AI-помощники и модели VedaMatch.',
        keywords: ['ai', 'ии', 'помощник', 'модель', 'ведаматч'],
        section: 'tools',
    },
];

export const DEFAULT_USER_PORTAL_LAYOUT: UserPortalLayout = {
    version: 1,
    order: USER_PORTAL_SERVICES.map((service) => service.id),
    hidden: [],
};

export const USER_PORTAL_STANDALONE_ROUTES = [
    '/user/dashboard',
    '/profile',
    '/services',
    '/contacts',
    '/chat',
    '/cafe',
    '/shops',
] as const;

export const USER_PORTAL_SHARED_ROUTES = [
    '/library',
    '/dating',
    '/ads',
    '/map',
    '/news',
    '/education',
    '/ai-models',
    '/calls',
] as const;

export const USER_PORTAL_KNOWN_ROUTES = [
    ...USER_PORTAL_STANDALONE_ROUTES,
    ...USER_PORTAL_SHARED_ROUTES,
    '/library/bookmarks',
] as const;

export const normalizePortalLayout = (rawLayout: unknown): UserPortalLayout => {
    const raw = rawLayout && typeof rawLayout === 'object' ? rawLayout as Partial<UserPortalLayout> : {};
    const knownIds = new Set(USER_PORTAL_SERVICES.map((service) => service.id));
    const rawOrder = Array.isArray(raw.order) ? raw.order : [];
    const rawHidden = Array.isArray(raw.hidden) ? raw.hidden : [];
    const order = [
        ...rawOrder.filter((id): id is PortalServiceId => typeof id === 'string' && knownIds.has(id as PortalServiceId)),
        ...DEFAULT_USER_PORTAL_LAYOUT.order.filter((id) => !rawOrder.includes(id)),
    ];
    const hidden = rawHidden.filter((id): id is PortalServiceId => typeof id === 'string' && knownIds.has(id as PortalServiceId));

    return { version: 1, order, hidden };
};

export const getOrderedPortalServices = (layout: UserPortalLayout): UserPortalService[] => {
    const byId = new Map(USER_PORTAL_SERVICES.map((service) => [service.id, service]));
    return layout.order
        .map((id) => byId.get(id))
        .filter((service): service is UserPortalService => Boolean(service))
        .filter((service) => !layout.hidden.includes(service.id));
};

export const validateUserPortalServiceLinks = (services: UserPortalService[] = USER_PORTAL_SERVICES): string[] => {
    const knownRoutes = new Set<string>(USER_PORTAL_KNOWN_ROUTES);
    return services
        .filter((service) => !knownRoutes.has(service.path))
        .map((service) => `${service.label}: ${service.path}`);
};
