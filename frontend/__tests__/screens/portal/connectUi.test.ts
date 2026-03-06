import { resolveConnectSourceRoute } from '../../../screens/portal/connect/connectUi';

describe('connectUi', () => {
    it('maps yatra source links to YatraDetail', () => {
        expect(resolveConnectSourceRoute({ type: 'yatra', id: 15, screen: 'YatraDetail', label: 'Yatra' })).toEqual({
            screen: 'YatraDetail',
            params: { yatraId: 15 },
        });
    });

    it('maps seva source links to SevaProjectDetails', () => {
        expect(resolveConnectSourceRoute({ type: 'seva', id: 22, screen: 'SevaProjectDetails', label: 'Seva' })).toEqual({
            screen: 'SevaProjectDetails',
            params: { projectId: 22 },
        });
    });
});
