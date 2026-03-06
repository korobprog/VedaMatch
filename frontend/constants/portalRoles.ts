import { PortalBlueprint } from '../types/portalBlueprint';

export const FALLBACK_PORTAL_BLUEPRINTS: Record<string, PortalBlueprint> = {
  user: {
    role: 'user',
    title: 'Seeker',
    description: 'Basic portal for everyday practice.',
    highlightColor: '#6B7280',
    quickAccess: ['contacts', 'calls', 'services'],
    heroServices: ['path_tracker', 'rooms', 'multimedia', 'news', 'library'],
    servicesHint: [
      { serviceId: 'path_tracker', title: 'Daily Path', filters: ['daily_step', 'gentle_onboarding'] },
      { serviceId: 'multimedia', title: 'Media', filters: ['kirtan', 'lectures'] },
      { serviceId: 'news', title: 'News', filters: ['community', 'daily_digest'] },
      { serviceId: 'library', title: 'Library', filters: ['beginner_path', 'daily_reading'] },
      { serviceId: 'education', title: 'Education', filters: ['foundations'] },
    ],
  },
  in_goodness: {
    role: 'in_goodness',
    title: 'In Goodness',
    description: 'Services for a sattvic lifestyle.',
    highlightColor: '#22C55E',
    quickAccess: ['contacts', 'calls', 'services'],
    heroServices: ['path_tracker', 'cafe', 'education', 'services'],
    servicesHint: [
      { serviceId: 'path_tracker', title: 'Daily Path', filters: ['routine', 'stability'] },
      { serviceId: 'cafe', title: 'Cafe', filters: ['sattvic_menu', 'prasadam_only'] },
      { serviceId: 'education', title: 'Education', filters: ['habit_programs', 'sadhana'] },
      { serviceId: 'services', title: 'Services', filters: ['wellness', 'mentoring'] },
    ],
  },
  yogi: {
    role: 'yogi',
    title: 'Yogi',
    description: 'Practices, travel, and education in yoga mode.',
    highlightColor: '#0EA5E9',
    quickAccess: ['contacts', 'calls', 'services'],
    heroServices: ['path_tracker', 'services', 'travel', 'multimedia'],
    servicesHint: [
      { serviceId: 'path_tracker', title: 'Daily Path', filters: ['technique', 'progress'] },
      { serviceId: 'services', title: 'Services', filters: ['asana', 'breathwork', 'retreats'] },
      { serviceId: 'travel', title: 'Yatra', filters: ['pilgrimage_routes', 'retreat_housing'] },
      { serviceId: 'multimedia', title: 'Media', filters: ['kirtan', 'lectures'] },
    ],
  },
  devotee: {
    role: 'devotee',
    title: 'Devotee',
    description: 'Seva, yatras, and community life.',
    highlightColor: '#F97316',
    quickAccess: ['contacts', 'calls', 'services'],
    heroServices: ['path_tracker', 'ekadashi_calendar', 'seva', 'travel', 'news'],
    servicesHint: [
      { serviceId: 'path_tracker', title: 'Daily Path', filters: ['service_focus', 'community'] },
      { serviceId: 'ekadashi_calendar', title: 'Ekadashi', filters: ['fasting', 'parana', 'vaishnava_calendar'] },
      { serviceId: 'seva', title: 'Seva', filters: ['projects', 'donation_flow'] },
      { serviceId: 'charity', title: 'Charity', filters: ['verified_orgs', 'math_projects'] },
      { serviceId: 'travel', title: 'Yatra', filters: ['holy_places', 'group_tours'] },
      { serviceId: 'news', title: 'News', filters: ['temple_updates', 'festival_reports'] },
    ],
  },
};
