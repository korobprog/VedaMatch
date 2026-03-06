import { resolvePortalInitialTabLaunch, resolveServiceLaunch } from '../../../screens/portal/serviceLaunchResolver';

describe('serviceLaunchResolver', () => {
    it('routes services shortcut to assistant chat', () => {
        expect(resolveServiceLaunch('services')).toEqual({ kind: 'assistant_chat' });
    });

    it('routes services catalog shortcut to services tab', () => {
        expect(resolveServiceLaunch('services_catalog')).toEqual({ kind: 'open_portal_tab', tab: 'services' });
    });

    it('routes knowledge_base to library tab', () => {
        expect(resolveServiceLaunch('knowledge_base')).toEqual({ kind: 'open_portal_tab', tab: 'library' });
    });

    it('routes map to stack screen', () => {
        expect(resolveServiceLaunch('map')).toEqual({ kind: 'navigate', screen: 'MapGeoapify' });
    });

    it('routes connect shortcut to connect home', () => {
        expect(resolveServiceLaunch('connect')).toEqual({ kind: 'navigate', screen: 'ConnectHome' });
    });

    it('supports initial tab resolver with services_catalog', () => {
        expect(resolvePortalInitialTabLaunch('services_catalog')).toEqual({ kind: 'open_portal_tab', tab: 'services' });
    });
});
