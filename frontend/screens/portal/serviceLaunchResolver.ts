import { PortalInitialTab, RootStackParamList } from '../../types/navigation';

export type EmbeddedPortalTab =
    | 'services';

export type ServiceLaunchResolution =
    | { kind: 'assistant_chat' }
    | { kind: 'open_menu' }
    | { kind: 'open_portal_tab'; tab: EmbeddedPortalTab }
    | { kind: 'navigate'; screen: keyof RootStackParamList; params?: Record<string, unknown> }
    | { kind: 'unsupported' };

export const EMBEDDED_PORTAL_TABS = new Set<EmbeddedPortalTab>([
    'services',
]);

export const resolveServiceLaunch = (serviceId: string): ServiceLaunchResolution => {
    if (serviceId === 'chat') {
        return { kind: 'assistant_chat' };
    }

    if (serviceId === 'services') {
        return { kind: 'assistant_chat' };
    }

    if (serviceId === 'services_catalog') {
        return { kind: 'navigate', screen: 'ServicesHome' };
    }

    if (serviceId === 'contacts') {
        return { kind: 'navigate', screen: 'ContactsHome' };
    }

    if (serviceId === 'calls') {
        return { kind: 'navigate', screen: 'CallsHome' };
    }

    if (serviceId === 'rooms') {
        return { kind: 'navigate', screen: 'RoomsHome' };
    }

    if (serviceId === 'multimedia') {
        return { kind: 'navigate', screen: 'MultimediaHub' };
    }

    if (serviceId === 'shops') {
        return { kind: 'navigate', screen: 'MarketHome' };
    }

    if (serviceId === 'dating') {
        return { kind: 'navigate', screen: 'DatingHome' };
    }

    if (serviceId === 'cafe') {
        return { kind: 'navigate', screen: 'CafeHome' };
    }

    if (serviceId === 'news') {
        return { kind: 'navigate', screen: 'NewsHome' };
    }

    if (serviceId === 'library') {
        return { kind: 'navigate', screen: 'LibraryHome' };
    }

    if (serviceId === 'education') {
        return { kind: 'navigate', screen: 'EducationHome' };
    }

    if (serviceId === 'travel') {
        return { kind: 'navigate', screen: 'TravelHome' };
    }

    if (serviceId === 'ads') {
        return { kind: 'navigate', screen: 'Ads' };
    }

    if (serviceId === 'connect') {
        return { kind: 'navigate', screen: 'ConnectHome' };
    }

    if (serviceId === 'history') {
        return { kind: 'navigate', screen: 'CallsHome' };
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

    if (serviceId === 'dhama') {
        return { kind: 'navigate', screen: 'DhamaHome' };
    }

    if (serviceId === 'path_tracker') {
        return { kind: 'navigate', screen: 'PathTrackerHome' };
    }

    if (serviceId === 'channels') {
        return { kind: 'navigate', screen: 'ChannelsHub' };
    }

    if (serviceId === 'sadhu_sanga') {
        return { kind: 'navigate', screen: 'SadhuSangaHub' };
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

    if (serviceId === 'ekadashi_calendar') {
        return { kind: 'navigate', screen: 'EkadashiCalendar' };
    }

    if (serviceId === 'lila_battle_of_sages') {
        return { kind: 'navigate', screen: 'LilaBattleOfSagesHome' };
    }

    if (serviceId === 'knowledge_base') {
        return { kind: 'navigate', screen: 'LibraryHome' };
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
