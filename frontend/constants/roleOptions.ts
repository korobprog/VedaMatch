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
    title: 'Искатель',
    subtitle: 'Стартовый профиль',
    description: 'Для мягкого входа в экосистему сервисов.',
    image: require('../assets/roles/user.png'),
    servicesHint: ['Новости', 'Библиотека', 'Обучение', 'Кафе'],
    highlightColor: '#6B7280',
  },
  {
    id: 'in_goodness',
    title: 'В благости',
    subtitle: 'Саттвичный фокус',
    description: 'Питание, дисциплина, практики и сервисы баланса.',
    image: require('../assets/roles/in_goodness.png'),
    servicesHint: ['Кафе', 'Обучение', 'Услуги'],
    highlightColor: '#22C55E',
  },
  {
    id: 'yogi',
    title: 'Йог',
    subtitle: 'Практика и ретриты',
    description: 'Для активной практики и образовательных маршрутов.',
    image: require('../assets/roles/yogi.png'),
    servicesHint: ['Услуги', 'Yatra', 'Медия'],
    highlightColor: '#0EA5E9',
  },
  {
    id: 'devotee',
    title: 'Преданный',
    subtitle: 'Сева и община',
    description: 'Профиль для служения, ятр и глубокого вовлечения.',
    image: require('../assets/roles/devotee.png'),
    servicesHint: ['Сева', 'Благотворительность', 'Yatra', 'Новости'],
    highlightColor: '#F97316',
  },
];
