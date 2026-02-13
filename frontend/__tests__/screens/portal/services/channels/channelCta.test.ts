import { Alert } from 'react-native';

const mockTrackPostCtaClick = jest.fn();

jest.mock('../../../../../services/channelService', () => ({
  channelService: {
    trackPostCtaClick: (...args: any[]) => mockTrackPostCtaClick(...args),
  },
}));

const { handleChannelPostCta, getChannelPostCtaLabel } = require('../../../../../screens/portal/services/channels/channelCta');

const makePost = (overrides: Record<string, any> = {}) => ({
  ID: 101,
  channelId: 42,
  authorId: 7,
  type: 'text',
  content: 'post',
  mediaJson: '',
  ctaType: 'none',
  ctaPayloadJson: '',
  status: 'published',
  isPinned: false,
  CreatedAt: '2026-02-13T12:00:00Z',
  UpdatedAt: '2026-02-13T12:00:00Z',
  ...overrides,
});

describe('channelCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockTrackPostCtaClick.mockResolvedValue(undefined);
  });

  it('returns human labels for CTA types', () => {
    expect(getChannelPostCtaLabel(makePost({ ctaType: 'order_products' }))).toBe('Заказать');
    expect(getChannelPostCtaLabel(makePost({ ctaType: 'book_service' }))).toBe('Записаться');
    expect(getChannelPostCtaLabel(makePost({ ctaType: 'none' }))).toBeNull();
  });

  it('navigates to Checkout with channel attribution for order_products', () => {
    const navigation = { navigate: jest.fn() };
    const post = makePost({
      ID: 555,
      channelId: 33,
      ctaType: 'order_products',
      ctaPayloadJson: JSON.stringify({
        shopId: 9,
        items: [
          { productId: 1, quantity: 2, variantId: 4 },
          { productId: 2, quantity: 1 },
        ],
        buyerNote: 'Имена для ягьи',
      }),
    });

    handleChannelPostCta(navigation, post);

    expect(mockTrackPostCtaClick).toHaveBeenCalledWith(33, 555);
    expect(navigation.navigate).toHaveBeenCalledWith('Checkout', {
      shopId: 9,
      items: [
        { productId: 1, variantId: 4, quantity: 2 },
        { productId: 2, variantId: undefined, quantity: 1 },
      ],
      prefillBuyerNote: 'Имена для ягьи',
      source: 'channel_post',
      sourcePostId: 555,
      sourceChannelId: 33,
    });
  });

  it('shows alert and does not navigate on invalid order_products payload', () => {
    const navigation = { navigate: jest.fn() };
    const post = makePost({
      ctaType: 'order_products',
      ctaPayloadJson: JSON.stringify({ shopId: 9, items: [] }),
    });

    handleChannelPostCta(navigation, post);

    expect(mockTrackPostCtaClick).toHaveBeenCalledWith(42, 101);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Ошибка', 'Пост содержит некорректные данные заказа');
  });

  it('navigates to ServiceBooking with channel attribution for book_service', () => {
    const navigation = { navigate: jest.fn() };
    const post = makePost({
      ID: 777,
      channelId: 88,
      ctaType: 'book_service',
      ctaPayloadJson: JSON.stringify({ serviceId: 321 }),
    });

    handleChannelPostCta(navigation, post);

    expect(mockTrackPostCtaClick).toHaveBeenCalledWith(88, 777);
    expect(navigation.navigate).toHaveBeenCalledWith('ServiceBooking', {
      serviceId: 321,
      source: 'channel_post',
      sourcePostId: 777,
      sourceChannelId: 88,
    });
  });

  it('shows alert and does not navigate on invalid book_service payload', () => {
    const navigation = { navigate: jest.fn() };
    const post = makePost({
      ctaType: 'book_service',
      ctaPayloadJson: JSON.stringify({ serviceId: 0 }),
    });

    handleChannelPostCta(navigation, post);

    expect(mockTrackPostCtaClick).toHaveBeenCalledWith(42, 101);
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Ошибка', 'Пост содержит некорректные данные услуги');
  });
});

