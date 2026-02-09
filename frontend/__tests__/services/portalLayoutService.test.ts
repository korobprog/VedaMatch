import { applyRoleBlueprint } from '../../services/portalLayoutService';
import { createDefaultLayout } from '../../types/portal';

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

    expect(result.quickAccess.map((x) => x.serviceId)).toEqual(['travel', 'seva', 'news']);
    const firstPageServices = result.pages[0].items
      .filter((item) => item.type === 'service')
      .map((item: any) => item.serviceId);
    expect(firstPageServices[0]).toBe('seva');
    expect(firstPageServices[1]).toBe('travel');
  });
});
