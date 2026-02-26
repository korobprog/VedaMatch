import { PortalInitialTab, RootStackParamList } from '../../types/navigation';

export type EmbeddedPortalTab =
    | 'contacts'
    | 'chat'
    | 'rooms'
    | 'dating'
    | 'cafe'
    | 'shops'
    | 'ads'
    | 'news'
    | 'calls'
    | 'multimedia'
    | 'library'
    | 'education'
    | 'travel'
    | 'services';

export type ServiceLaunchResolution =
    | { kind: 'assistant_chat' }
    | { kind: 'open_menu' }
    | { kind: 'open_portal_tab'; tab: EmbeddedPortalTab }
    | { kind: 'navigate'; screen: keyof RootStackParamList; params?: Record<string, unknown> }
    | { kind: 'unsupported' };

export const EMBEDDED_PORTAL_TABS = new Set<EmbeddedPortalTab>([
    'contacts',
    'chat',
    'rooms',
    'dating',
    'cafe',
    'shops',
    'ads',
    'news',
    'calls',
    'multimedia',
    'library',
    'education',
    'travel',
    'services',
]);

export const resolveServiceLaunch = (serviceId: string): ServiceLaunchResolution => {
    if (serviceId === 'services') {
        return { kind: 'assistant_chat' };
    }

    if (serviceId === 'services_catalog') {
        return { kind: 'open_portal_tab', tab: 'services' };
    }

    if (serviceId === 'history') {
        return { kind: 'open_menu' };
    }

    if (serviceId === 'settings') {
        return { kind: 'navigate', screen: 'AppSettings' };
    }

    if (serviceId === 'support') {
        return { kind: 'navigate', screen: 'SupportHome', params: { entryPoint: 'portal' } };
    }

    if (serviceId === 'map') {
        return { kind: 'navigate', screen: 'MapGeoapify' };
    }

    if (serviceId === 'path_tracker') {
        return { kind: 'navigate', screen: 'PathTrackerHome' };
    }

    if (serviceId === 'channels') {
        return { kind: 'navigate', screen: 'ChannelsHub' };
    }

    if (serviceId === 'feed') {
        return { kind: 'navigate', screen: 'ChannelsHub' };
    }

    if (serviceId === 'video_circles') {
        return { kind: 'navigate', screen: 'VideoCirclesScreen' };
    }

    if (serviceId === 'seva') {
        return { kind: 'navigate', screen: 'SevaHub' };
    }

    if (serviceId === 'knowledge_base') {
        return { kind: 'open_portal_tab', tab: 'library' };
    }

    if (EMBEDDED_PORTAL_TABS.has(serviceId as EmbeddedPortalTab)) {
        return { kind: 'open_portal_tab', tab: serviceId as EmbeddedPortalTab };
    }

    return { kind: 'unsupported' };
};

export const resolvePortalInitialTabLaunch = (initialTab?: PortalInitialTab): ServiceLaunchResolution | null => {
    if (!initialTab) {
        return null;
    }
    return resolveServiceLaunch(initialTab);
};
