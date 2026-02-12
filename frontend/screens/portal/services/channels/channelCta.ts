import { Alert } from 'react-native';
import { ChannelPost } from '../../../../types/channel';
import { CartItem } from '../../../../types/market';
import { channelService } from '../../../../services/channelService';

type NavigationLike = {
  navigate: (screen: string, params?: Record<string, any>) => void;
};

type OrderPayloadItem = {
  productId: number;
  quantity: number;
  variantId?: number;
};

type OrderPayload = {
  shopId: number;
  items: OrderPayloadItem[];
  buyerNote?: string;
};

type BookServicePayload = {
  serviceId: number;
};

const toPositiveInt = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed > 0 ? Math.floor(parsed) : 0;
};

const parsePayload = (raw: string): Record<string, any> | null => {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, any>;
    }
    return null;
  } catch {
    return null;
  }
};

const parseOrderPayload = (payload: Record<string, any> | null): OrderPayload | null => {
  if (!payload) {
    return null;
  }

  const shopId = toPositiveInt(payload.shopId);
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  if (shopId === 0 || rawItems.length === 0) {
    return null;
  }

  const items: OrderPayloadItem[] = rawItems
    .map((item: any) => ({
      productId: toPositiveInt(item?.productId),
      quantity: toPositiveInt(item?.quantity),
      variantId: toPositiveInt(item?.variantId) || undefined,
    }))
    .filter(item => item.productId > 0 && item.quantity > 0);

  if (items.length === 0) {
    return null;
  }

  return {
    shopId,
    items,
    buyerNote: typeof payload.buyerNote === 'string' ? payload.buyerNote : undefined,
  };
};

const parseBookServicePayload = (payload: Record<string, any> | null): BookServicePayload | null => {
  if (!payload) {
    return null;
  }
  const serviceId = toPositiveInt(payload.serviceId);
  if (serviceId === 0) {
    return null;
  }
  return { serviceId };
};

export const getChannelPostCtaLabel = (post: ChannelPost): string | null => {
  if (post.ctaType === 'order_products') {
    return 'Заказать';
  }
  if (post.ctaType === 'book_service') {
    return 'Записаться';
  }
  return null;
};

export const handleChannelPostCta = (navigation: NavigationLike, post: ChannelPost) => {
  const payload = parsePayload(post.ctaPayloadJson);
  void channelService.trackPostCtaClick(post.channelId, post.ID).catch(() => {});

  if (post.ctaType === 'order_products') {
    const orderPayload = parseOrderPayload(payload);
    if (!orderPayload) {
      Alert.alert('Ошибка', 'Пост содержит некорректные данные заказа');
      return;
    }

    const checkoutItems: CartItem[] = orderPayload.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    navigation.navigate('Checkout', {
      shopId: orderPayload.shopId,
      items: checkoutItems,
      prefillBuyerNote: orderPayload.buyerNote,
      source: 'channel_post',
      sourcePostId: post.ID,
      sourceChannelId: post.channelId,
    });
    return;
  }

  if (post.ctaType === 'book_service') {
    const servicePayload = parseBookServicePayload(payload);
    if (!servicePayload) {
      Alert.alert('Ошибка', 'Пост содержит некорректные данные услуги');
      return;
    }

    navigation.navigate('ServiceBooking', {
      serviceId: servicePayload.serviceId,
      source: 'channel_post',
      sourcePostId: post.ID,
      sourceChannelId: post.channelId,
    });
  }
};
