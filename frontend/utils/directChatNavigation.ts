import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import type { UserContact } from '../services/contactService';
import { resolveUserDisplayName } from './userDisplay';

type ChatNavigation = NavigationProp<RootStackParamList>;
type DirectChatRoute =
    | { name: 'ChatInbox'; params?: undefined }
    | { name: 'Chat'; params: NonNullable<RootStackParamList['Chat']> };

export const buildDirectChatRoute = (
    options: { userId?: number; name?: string } = {},
): DirectChatRoute => {
    const userId = Number.parseInt(String(options.userId ?? ''), 10);
    if (Number.isFinite(userId) && userId > 0) {
        return {
            name: 'Chat',
            params: {
                userId,
                name: options.name?.trim() || undefined,
            },
        };
    }

    return { name: 'ChatInbox' };
};

export const getDirectChatDisplayName = (contact: Pick<UserContact, 'ID' | 'spiritualName' | 'karmicName' | 'nickname' | 'nicknameDisplay' | 'email'>, fallbackLabel?: string) => {
    return resolveUserDisplayName(contact as UserContact, {
        fallbackLabel: fallbackLabel || `User #${contact.ID}`,
    });
};

export const openDirectChatRoute = (
    navigation: ChatNavigation,
    options: { userId?: number; name?: string } = {},
) => {
    const route = buildDirectChatRoute(options);
    if (route.name === 'Chat') {
        navigation.navigate(route.name, route.params);
        return;
    }
    navigation.navigate(route.name);
};

export const navigateToDirectChat = (
    navigation: ChatNavigation,
    contact: UserContact,
    options: { fallbackLabel?: string } = {},
) => {
    const fallbackLabel = options.fallbackLabel || `User #${contact.ID}`;
    openDirectChatRoute(navigation, {
        userId: contact.ID,
        name: resolveUserDisplayName(contact, { fallbackLabel }) || undefined,
    });
};

export const navigateToDirectChatByUserId = (
    navigation: ChatNavigation,
    userId: number,
    options: { name?: string } = {},
) => {
    openDirectChatRoute(navigation, {
        userId,
        name: options.name,
    });
};

export const openChatInbox = (navigation: ChatNavigation) => {
    openDirectChatRoute(navigation);
};
