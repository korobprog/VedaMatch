import { PortalBlueprint } from '../types/portalBlueprint';

export const FALLBACK_PORTAL_BLUEPRINTS: Record<string, PortalBlueprint> = {
  user: {
    role: 'user',
    title: 'Искатель',
    description: 'Базовый портал для повседневной практики.',
    highlightColor: '#6B7280',
    quickAccess: ['path_tracker', 'rooms', 'multimedia'],
    heroServices: ['path_tracker', 'rooms', 'multimedia', 'news', 'library'],
    servicesHint: [
      { serviceId: 'path_tracker', title: 'Путь дня', filters: ['daily_step', 'gentle_onboarding'] },
      { serviceId: 'multimedia', title: 'Медия', filters: ['kirtan', 'lectures'] },
      { serviceId: 'news', title: 'Новости', filters: ['community', 'daily_digest'] },
      { serviceId: 'library', title: 'Библиотека', filters: ['beginner_path', 'daily_reading'] },
      { serviceId: 'education', title: 'Обучение', filters: ['foundations'] },
    ],
  },
  in_goodness: {
    role: 'in_goodness',
    title: 'В благости',
    description: 'Сервисы для саттвичного образа жизни.',
    highlightColor: '#22C55E',
    quickAccess: ['path_tracker', 'education', 'news'],
    heroServices: ['path_tracker', 'cafe', 'education', 'services'],
    servicesHint: [
      { serviceId: 'path_tracker', title: 'Путь дня', filters: ['routine', 'stability'] },
      { serviceId: 'cafe', title: 'Кафе', filters: ['sattvic_menu', 'prasadam_only'] },
      { serviceId: 'education', title: 'Обучение', filters: ['habit_programs', 'sadhana'] },
      { serviceId: 'services', title: 'Услуги', filters: ['wellness', 'mentoring'] },
    ],
  },
  yogi: {
    role: 'yogi',
    title: 'Йог',
    description: 'Практики, поездки и обучение в режиме йоги.',
    highlightColor: '#0EA5E9',
    quickAccess: ['path_tracker', 'travel', 'education'],
    heroServices: ['path_tracker', 'services', 'travel', 'multimedia'],
    servicesHint: [
      { serviceId: 'path_tracker', title: 'Путь дня', filters: ['technique', 'progress'] },
      { serviceId: 'services', title: 'Услуги', filters: ['asana', 'breathwork', 'retreats'] },
      { serviceId: 'travel', title: 'Yatra', filters: ['pilgrimage_routes', 'retreat_housing'] },
      { serviceId: 'multimedia', title: 'Медия', filters: ['kirtan', 'lectures'] },
    ],
  },
  devotee: {
    role: 'devotee',
    title: 'Преданный',
    description: 'Сева, ятры и жизнь в общине.',
    highlightColor: '#F97316',
    quickAccess: ['path_tracker', 'seva', 'news'],
    heroServices: ['path_tracker', 'seva', 'travel', 'news'],
    servicesHint: [
      { serviceId: 'path_tracker', title: 'Путь дня', filters: ['service_focus', 'community'] },
      { serviceId: 'seva', title: 'Сева', filters: ['projects', 'donation_flow'] },
      { serviceId: 'charity', title: 'Благотворительность', filters: ['verified_orgs', 'math_projects'] },
      { serviceId: 'travel', title: 'Yatra', filters: ['holy_places', 'group_tours'] },
      { serviceId: 'news', title: 'Новости', filters: ['temple_updates', 'festival_reports'] },
    ],
  },
};
