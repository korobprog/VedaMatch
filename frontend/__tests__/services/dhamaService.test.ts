import apiClient from '../../lib/apiClient';
import { dhamaService, normalizeDhamaCollection, normalizeHolyPlaceDetail } from '../../services/dhamaService';

jest.mock('../../lib/apiClient', () => ({
  get: jest.fn(),
}));

describe('dhamaService', () => {
  beforeEach(() => {
    (apiClient.get as jest.Mock).mockReset();
  });

  it('normalizes missing array fields in holy place detail payload', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        id: 5,
        slug: 'vrindavan',
        title: 'Vrindavan',
        shortDescription: 'Sacred place',
        placeType: 'dham',
        city: 'Vrindavan',
        state: 'Uttar Pradesh',
        country: 'India',
        latitude: 27.58,
        longitude: 77.7,
        locale: 'en',
      },
    });

    const result = await dhamaService.getPlace('vrindavan');

    expect(apiClient.get).toHaveBeenCalledWith('/dhama/places/vrindavan');
    expect(result.gallery).toEqual([]);
    expect(result.linkedMedia).toEqual([]);
    expect(result.linkedYatras).toEqual([]);
    expect(result.availableLocales).toEqual([]);
  });

  it('normalizes partial payloads into safe frontend shape', () => {
    const result = normalizeHolyPlaceDetail(null);

    expect(result.slug).toBe('');
    expect(result.gallery).toEqual([]);
    expect(result.linkedMedia).toEqual([]);
    expect(result.linkedYatras).toEqual([]);
    expect(result.collections).toEqual([]);
    expect(result.locale).toBe('en');
  });

  it('normalizes dhama collections with safe place previews', () => {
    const result = normalizeDhamaCollection({
      id: 2,
      slug: 'gaudiya-pilgrimage-axis',
      title: 'Gaudiya places',
      description: 'Curated pilgrimage route',
      placesCount: 2,
      places: [{ id: 10, slug: 'mayapur', title: 'Mayapur', city: 'Mayapur', state: 'West Bengal', isFeatured: false }],
    });

    expect(result.slug).toBe('gaudiya-pilgrimage-axis');
    expect(result.places).toEqual([
      {
        id: 10,
        slug: 'mayapur',
        title: 'Mayapur',
        city: 'Mayapur',
        state: 'West Bengal',
        heroImageUrl: undefined,
        isFeatured: false,
      },
    ]);
  });

  it('loads dhama collection detail with safe normalized places', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        id: 3,
        slug: 'krishna-sacred-geography',
        title: 'Krishna Sacred Geography',
        description: 'Curated sacred route',
        placesCount: 1,
        places: [{ id: 11, slug: 'dwarka', title: 'Dwarka', city: 'Dwarka', state: 'Gujarat' }],
      },
    });

    const result = await dhamaService.getCollection('krishna-sacred-geography');

    expect(apiClient.get).toHaveBeenCalledWith('/dhama/collections/krishna-sacred-geography');
    expect(result.places).toEqual([
      {
        id: 11,
        slug: 'dwarka',
        title: 'Dwarka',
        city: 'Dwarka',
        state: 'Gujarat',
        heroImageUrl: undefined,
        isFeatured: false,
      },
    ]);
  });
});
