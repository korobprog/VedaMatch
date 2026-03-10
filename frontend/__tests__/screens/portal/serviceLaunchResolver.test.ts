import { resolvePortalInitialTabLaunch, resolveServiceLaunch } from '../../../screens/portal/serviceLaunchResolver';

describe('serviceLaunchResolver', () => {
    it('routes services shortcut to assistant chat', () => {
        expect(resolveServiceLaunch('services')).toEqual({ kind: 'assistant_chat' });
    });

    it('routes services catalog shortcut to services stack screen', () => {
        expect(resolveServiceLaunch('services_catalog')).toEqual({ kind: 'navigate', screen: 'ServicesHome' });
    });

    it('routes calls shortcut to calls stack screen', () => {
        expect(resolveServiceLaunch('calls')).toEqual({ kind: 'navigate', screen: 'CallsHome' });
    });

    it('routes rooms shortcut to rooms stack screen', () => {
        expect(resolveServiceLaunch('rooms')).toEqual({ kind: 'navigate', screen: 'RoomsHome' });
    });

    it('routes multimedia shortcut to multimedia stack screen', () => {
        expect(resolveServiceLaunch('multimedia')).toEqual({ kind: 'navigate', screen: 'MultimediaHub' });
    });

    it('routes shops shortcut to market home stack screen', () => {
        expect(resolveServiceLaunch('shops')).toEqual({ kind: 'navigate', screen: 'MarketHome' });
    });

    it('routes dating shortcut to dating home stack screen', () => {
        expect(resolveServiceLaunch('dating')).toEqual({ kind: 'navigate', screen: 'DatingHome' });
    });

    it('routes cafe shortcut to cafe home stack screen', () => {
        expect(resolveServiceLaunch('cafe')).toEqual({ kind: 'navigate', screen: 'CafeHome' });
    });

    it('routes news shortcut to news home stack screen', () => {
        expect(resolveServiceLaunch('news')).toEqual({ kind: 'navigate', screen: 'NewsHome' });
    });

    it('routes library shortcut to library home stack screen', () => {
        expect(resolveServiceLaunch('library')).toEqual({ kind: 'navigate', screen: 'LibraryHome' });
    });

    it('routes knowledge_base to library home stack screen', () => {
        expect(resolveServiceLaunch('knowledge_base')).toEqual({ kind: 'navigate', screen: 'LibraryHome' });
    });

    it('routes education shortcut to education home stack screen', () => {
        expect(resolveServiceLaunch('education')).toEqual({ kind: 'navigate', screen: 'EducationHome' });
    });

    it('routes travel shortcut to travel home stack screen', () => {
        expect(resolveServiceLaunch('travel')).toEqual({ kind: 'navigate', screen: 'TravelHome' });
    });

    it('routes ads shortcut to ads stack screen', () => {
        expect(resolveServiceLaunch('ads')).toEqual({ kind: 'navigate', screen: 'Ads' });
    });

    it('routes map to stack screen', () => {
        expect(resolveServiceLaunch('map')).toEqual({ kind: 'navigate', screen: 'MapGeoapify' });
    });

    it('routes dhama to stack screen', () => {
        expect(resolveServiceLaunch('dhama')).toEqual({ kind: 'navigate', screen: 'DhamaHome' });
    });

    it('routes connect shortcut to connect home', () => {
        expect(resolveServiceLaunch('connect')).toEqual({ kind: 'navigate', screen: 'ConnectHome' });
    });

    it('supports initial tab resolver with services_catalog', () => {
        expect(resolvePortalInitialTabLaunch('services_catalog')).toEqual({ kind: 'navigate', screen: 'ServicesHome' });
    });
});
