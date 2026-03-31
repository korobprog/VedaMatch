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

jest.mock(
  '@react-native-community/netinfo',
  () => ({
    __esModule: true,
    default: {
      fetch: jest.fn(async () => ({ type: 'wifi', isConnected: true })),
      addEventListener: jest.fn(() => jest.fn()),
    },
  }),
  { virtual: true }
);

import { applyRoleBlueprint, filterLayoutByPortalVisibility, isPortalServiceVisibleForUser } from '../../services/portalLayoutService';
import { createDefaultLayout } from '../../types/portal';
import { migrateCalendarServiceIntoCalendarFolder, migrateLegacyFlatLayoutToDefaultFolders, migrateLilaServiceIntoGamesFolder } from '../../context/PortalLayoutContext';

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
      'folder',
      'folder',
    ]);
    expect(layout.pages[0].items.map((item: any) => item.name)).toEqual([
      'Общение',
      'Календарь',
      'Практика',
      'Контент',
      'Сервисы',
      'Игры',
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
    expect((layout.pages[0].items[4] as any).items.map((item: any) => item.serviceId)).toEqual([
      'services_catalog',
      'cafe',
      'shops',
      'ads',
      'dating',
    ]);
    expect((layout.pages[0].items[5] as any).items.map((item: any) => item.serviceId)).toEqual([
      'lila_battle_of_sages',
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
      'folder',
      'folder',
    ]);
  });
});

describe('portalLayoutService portal visibility bypass', () => {
  it('keeps blocked services visible for admin roles', () => {
    expect(isPortalServiceVisibleForUser('chat', { chat: { mode: 'hidden', visible: false } as any }, 'admin')).toBe(true);
    expect(isPortalServiceVisibleForUser('chat', { chat: { mode: 'beta', visible: false } as any }, 'superadmin')).toBe(true);
  });

  it('filters blocked services for regular users but not for admins', () => {
    const layout = createDefaultLayout();
    const visibilityMap = {
      chat: { mode: 'hidden', visible: false, maintenanceMessage: 'hidden' },
      services: { mode: 'beta', visible: false, maintenanceMessage: 'beta' },
    };

    const userLayout = filterLayoutByPortalVisibility(layout, visibilityMap as any, 'user');
    const adminLayout = filterLayoutByPortalVisibility(layout, visibilityMap as any, 'admin');

    const userQuickAccess = userLayout.quickAccess.map((item) => item.serviceId);
    const adminQuickAccess = adminLayout.quickAccess.map((item) => item.serviceId);

    expect(userQuickAccess).toEqual(['contacts', 'calls']);
    expect(adminQuickAccess).toEqual(['contacts', 'calls', 'services']);

    const communicationFolderForUser = userLayout.pages[0].items.find((item: any) => item.type === 'folder' && item.id === 'folder-communication') as any;
    const communicationFolderForAdmin = adminLayout.pages[0].items.find((item: any) => item.type === 'folder' && item.id === 'folder-communication') as any;

    expect(communicationFolderForUser.items.map((item: any) => item.serviceId)).not.toContain('chat');
    expect(communicationFolderForAdmin.items.map((item: any) => item.serviceId)).toContain('chat');
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

  it('moves calendar service from practice folder into dedicated calendar folder for saved default layouts', () => {
    const base = createDefaultLayout();
    const savedLayout = {
      ...base,
      pages: [{
        ...base.pages[0],
        items: [
          {
            id: 'folder-communication',
            name: 'Общение',
            type: 'folder',
            color: '#3B82F6',
            position: 0,
            items: [{ id: 'item-chat', serviceId: 'chat', type: 'service', position: 0 }],
          },
          {
            id: 'folder-practice',
            name: 'Практика',
            type: 'folder',
            color: '#10B981',
            position: 1,
            items: [
              { id: 'item-path', serviceId: 'path_tracker', type: 'service', position: 0 },
              { id: 'item-ekadashi', serviceId: 'ekadashi_calendar', type: 'service', position: 1 },
            ],
          },
        ],
      }],
    };

    const { layout, changed } = migrateCalendarServiceIntoCalendarFolder(savedLayout as any);

    expect(changed).toBe(true);
    expect(layout.pages[0].items.map((item: any) => item.name)).toEqual([
      'Общение',
      'Календарь',
      'Практика',
    ]);
    expect((layout.pages[0].items[1] as any).items.map((item: any) => item.serviceId)).toEqual(['ekadashi_calendar']);
    expect((layout.pages[0].items[2] as any).items.map((item: any) => item.serviceId)).toEqual(['path_tracker']);
  });

  it('moves Lila service into dedicated games folder for saved layouts', () => {
    const base = createDefaultLayout();
    const savedLayout = {
      ...base,
      pages: [{
        ...base.pages[0],
        items: [
          {
            id: 'folder-services',
            name: 'Сервисы',
            type: 'folder',
            color: '#F59E0B',
            position: 0,
            items: [
              { id: 'item-services_catalog', serviceId: 'services_catalog', type: 'service', position: 0 },
              { id: 'item-lila', serviceId: 'lila_battle_of_sages', type: 'service', position: 1 },
            ],
          },
          {
            id: 'folder-profile',
            name: 'Профиль',
            type: 'folder',
            color: '#6B7280',
            position: 1,
            items: [{ id: 'item-settings', serviceId: 'settings', type: 'service', position: 0 }],
          },
        ],
      }],
    };

    const { layout, changed } = migrateLilaServiceIntoGamesFolder(savedLayout as any);

    expect(changed).toBe(true);
    expect(layout.pages[0].items.map((item: any) => item.name)).toEqual([
      'Сервисы',
      'Профиль',
      'Игры',
    ]);
    expect((layout.pages[0].items[0] as any).items.map((item: any) => item.serviceId)).toEqual(['services_catalog']);
    expect((layout.pages[0].items[2] as any).items.map((item: any) => item.serviceId)).toEqual(['lila_battle_of_sages']);
  });
});
