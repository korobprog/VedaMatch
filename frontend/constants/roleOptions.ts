import { ImageSourcePropType } from 'react-native';
import { PortalRole } from '../types/portalBlueprint';

export interface RoleOption {
  id: PortalRole;
  title: string;
  subtitle: string;
  description: string;
  image: ImageSourcePropType;
  servicesHint: string[];
  highlightColor: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'user',
    title: 'Seeker',
    subtitle: 'Starter profile',
    description: 'For a smooth entry into the service ecosystem.',
    image: require('../assets/roles/user.png'),
    servicesHint: ['Media', 'News', 'Library', 'Education'],
    highlightColor: '#6B7280',
  },
  {
    id: 'in_goodness',
    title: 'In Goodness',
    subtitle: 'Sattvic focus',
    description: 'Nutrition, discipline, practices, and balance services.',
    image: require('../assets/roles/in_goodness.png'),
    servicesHint: ['Cafe', 'Education', 'Services'],
    highlightColor: '#22C55E',
  },
  {
    id: 'yogi',
    title: 'Yogi',
    subtitle: 'Practice and retreats',
    description: 'For active practice and educational routes.',
    image: require('../assets/roles/yogi.png'),
    servicesHint: ['Services', 'Yatra', 'Media'],
    highlightColor: '#0EA5E9',
  },
  {
    id: 'devotee',
    title: 'Devotee',
    subtitle: 'Seva and community',
    description: 'Profile for service, yatras, and deep involvement.',
    image: require('../assets/roles/devotee.png'),
    servicesHint: ['Seva', 'Charity', 'Yatra', 'News'],
    highlightColor: '#F97316',
  },
];
