import React from 'react';
import { render } from '@testing-library/react-native';
import { FolderModal } from '../../../components/portal/FolderModal';
import type { PortalFolder } from '../../../types/portal';

jest.mock('@react-native-community/blur', () => ({ BlurView: 'BlurView' }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        'portal.serviceLabels.chat': 'Чат',
        'portal.serviceLabels.services_catalog': 'Сервисы',
        'portal.grid.folder': 'Папка',
        'portal.folderModal.empty': 'Папка пуста',
        'portal.folderModal.hint': 'Перетащите сервисы сюда или удерживайте иконку, чтобы убрать сервис из папки.',
      };
      return translations[key] ?? options?.defaultValue ?? key;
    },
  }),
}));

jest.mock('../../../context/SettingsContext', () => ({
  useSettings: () => ({
    vTheme: {
      colors: {
        text: '#111111',
        textSecondary: '#777777',
      },
    },
    isDarkMode: false,
    portalBackgroundType: 'color',
    performanceMode: 'high_quality',
    runtimePerformanceState: null,
  }),
}));

jest.mock('../../../components/portal/PortalIcon', () => ({
  PortalIcon: ({ service }: { service: { label: string } }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{service.label}</ReactNative.Text>;
  },
}));

describe('FolderModal', () => {
  const baseProps = {
    visible: true,
    onClose: jest.fn(),
    onRename: jest.fn(),
    onChangeColor: jest.fn(),
    onItemPress: jest.fn(),
    onRemoveItem: jest.fn(),
  };

  it('shows localized service labels inside the folder modal', () => {
    const folder: PortalFolder = {
      id: 'folder-1',
      type: 'folder',
      name: 'Общение',
      color: '#FF9933',
      position: 0,
      items: [
        { id: 'item-1', type: 'service', serviceId: 'chat', position: 0 },
        { id: 'item-2', type: 'service', serviceId: 'services_catalog', position: 1 },
      ],
    };

    const screen = render(<FolderModal {...baseProps} folder={folder} />);

    expect(screen.getByText('Чат')).toBeTruthy();
    expect(screen.getByText('Сервисы')).toBeTruthy();
  });

  it('shows localized empty state copy', () => {
    const folder: PortalFolder = {
      id: 'folder-2',
      type: 'folder',
      name: 'Пусто',
      color: '#FF9933',
      position: 0,
      items: [],
    };

    const screen = render(<FolderModal {...baseProps} folder={folder} />);

    expect(screen.getByText('Папка пуста')).toBeTruthy();
    expect(screen.getByText('Перетащите сервисы сюда или удерживайте иконку, чтобы убрать сервис из папки.')).toBeTruthy();
  });
});
