import React from 'react';
import { render } from '@testing-library/react-native';
import { VKAuthModal } from '../../../components/auth/VKAuthModal';

let mockWebViewProps: any;

jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  RotateCcw: () => null,
}));

jest.mock('react-native-webview', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    WebView: ReactModule.forwardRef((props: any, _ref: any) => {
      mockWebViewProps = props;
      return ReactModule.createElement(View, { testID: 'mock-webview' });
    }),
  };
});

jest.mock('../../../services/socialAuthService', () => ({
  isVKAuthCallbackUrl: (url: string) => (
    url.startsWith('vk54474353://vk.ru/blank.html')
    || url.startsWith('https://api.vedamatch.ru/auth/vk/callback')
  ),
}));

describe('VKAuthModal', () => {
  beforeEach(() => {
    mockWebViewProps = undefined;
  });

  it('blocks callback navigation and completes VK auth from onShouldStartLoadWithRequest', () => {
    const onComplete = jest.fn();

    render(
      <VKAuthModal
        visible
        authorizeUrl="https://oauth.vk.com/authorize?state=vk-state"
        title="VK"
        loadingLabel="Loading"
        closeLabel="Close"
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    const callbackUrl = 'vk54474353://vk.ru/blank.html?code=vk-auth-code&state=vk-state&device_id=vk-device-id';
    const shouldStart = mockWebViewProps.onShouldStartLoadWithRequest({ url: callbackUrl });

    expect(shouldStart).toBe(false);
    expect(onComplete).toHaveBeenCalledWith(callbackUrl);
  });

  it('allows non-callback VK pages to continue loading inside the WebView', () => {
    const onComplete = jest.fn();

    render(
      <VKAuthModal
        visible
        authorizeUrl="https://oauth.vk.com/authorize?state=vk-state"
        title="VK"
        loadingLabel="Loading"
        closeLabel="Close"
        onClose={jest.fn()}
        onComplete={onComplete}
      />,
    );

    const shouldStart = mockWebViewProps.onShouldStartLoadWithRequest({
      url: 'https://oauth.vk.com/authorize?state=vk-state',
    });

    expect(shouldStart).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
