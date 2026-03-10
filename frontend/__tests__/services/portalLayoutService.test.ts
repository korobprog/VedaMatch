jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  getUniqueId: jest.fn(async () => 'test-device-id'),
}));

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getBoolean: jest.fn(),
    getNumber: jest.fn(),
  })),
}));

import { applyRoleBlueprint } from '../../services/portalLayoutService';
import { createDefaultLayout } from '../../types/portal';
import { migrateLegacyFlatLayoutToDefaultFolders } from '../../context/PortalLayoutContext';

describe('portal default layout folders', () => {
  it('creates first page with default thematic folders and keeps quick access unchanged', () => {
    const layout = createDefaultLayout();

    expect(layout.quickAccess.map((x) => x.serviceId)).toEqual(['contacts', 'calls', 'services']);
    expect(layout.pages).toHaveLength(1);
    expect(layout.pages[0].items.map((item: any) => item.type)).toEqual([
      'folder',
      'folder',
      'folder',
      'folder',
      'folder',
      'folder',
    ]);
    expect(layout.pages[0].items.map((item: any) => item.name)).toEqual([
      'Общение',
      'Практика',
      'Контент',
      'Сервисы',
      'Путешествия',
      'Профиль',
    ]);
    expect((layout.pages[0].items[0] as any).items.map((item: any) => item.serviceId)).toEqual([
      'chat',
      'rooms',
      'channels',
      'connect',
      'history',
    ]);
    expect((layout.pages[0].items[3] as any).items.map((item: any) => item.serviceId)).toEqual([
      'services_catalog',
      'cafe',
      'shops',
      'ads',
      'dating',
    ]);
  });
});

describe('portalLayoutService.applyRoleBlueprint', () => {
  it('prioritizes hero services and applies quick access from blueprint', () => {
    const layout = createDefaultLayout();
    const result = applyRoleBlueprint(layout, {
      role: 'devotee',
      title: 'Преданный',
      description: 'test',
      highlightColor: '#F97316',
      quickAccess: ['travel', 'seva', 'news'],
      heroServices: ['seva', 'travel', 'news'],
      servicesHint: [],
    });

    expect(result.quickAccess.map((x) => x.serviceId)).toEqual(['travel', 'services', 'news']);
    const firstPageServices = result.pages[0].items
      .filter((item) => item.type === 'service')
      .map((item: any) => item.serviceId);
    expect(firstPageServices).toEqual([]);
    expect(result.pages[0].items.map((item: any) => item.type)).toEqual([
      'folder',
      'folder',
      'folder',
      'folder',
      'folder',
      'folder',
    ]);
  });
});

describe('portal legacy flat layout migration', () => {
  it('migrates single-page flat services into default thematic folders', () => {
    const base = createDefaultLayout();
    const legacyFlatLayout = {
      ...base,
      pages: [{
        ...base.pages[0],
        items: [
          { id: 'item-chat', serviceId: 'chat', type: 'service', position: 0 },
          { id: 'item-rooms', serviceId: 'rooms', type: 'service', position: 1 },
          { id: 'item-feed', serviceId: 'feed', type: 'service', position: 2 },
          { id: 'item-travel', serviceId: 'travel', type: 'service', position: 3 },
          { id: 'item-settings', serviceId: 'settings', type: 'service', position: 4 },
        ],
      }],
    };

    const { layout, changed } = migrateLegacyFlatLayoutToDefaultFolders(legacyFlatLayout as any);

    expect(changed).toBe(true);
    expect(layout.pages[0].items.map((item: any) => item.type)).toEqual([
      'folder',
      'folder',
      'folder',
      'folder',
    ]);
    expect(layout.pages[0].items.map((item: any) => item.name)).toEqual([
      'Общение',
      'Контент',
      'Путешествия',
      'Профиль',
    ]);
  });
});
