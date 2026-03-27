import { LinkingOptions } from '@react-navigation/native';
import { Linking } from 'react-native';
import { RootStackParamList } from '../types/navigation';
import { isTelegramAuthCallbackUrl, isVKAuthCallbackUrl } from '../services/socialAuthService';

export const linking: LinkingOptions<RootStackParamList> = {
    prefixes: ['vedamatch://', 'https://vedamatch.ru', 'https://www.vedamatch.ru', 'https://api.vedamatch.ru'],
    async getInitialURL() {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && (isVKAuthCallbackUrl(initialUrl) || isTelegramAuthCallbackUrl(initialUrl))) {
            return null;
        }
        return initialUrl;
    },
    subscribe(listener) {
        const subscription = Linking.addEventListener('url', ({ url }) => {
            if (isVKAuthCallbackUrl(url) || isTelegramAuthCallbackUrl(url)) {
                return;
            }
            listener(url);
        });

        return () => {
            subscription.remove();
        };
    },
    config: {
        screens: {
            // Auth screens handling
            Login: {
                path: 'login/:inviteCode?',
                parse: {
                    inviteCode: (code: string) => code,
                },
            },
            Registration: {
                path: 'register/:inviteCode?', // Standard reg link
                parse: {
                    inviteCode: (code: string) => code,
                },
            },

            // Portal Deep Links with tab support
            Portal: {
                path: 'portal/:initialTab?',
                parse: {
                    initialTab: (tab: string) => tab,
                },
            },

            // Direct access to Invite Friends screen (for logged in users)
            InviteFriends: 'invite-friends',
            ChatInbox: 'chats',
            Chat: {
                path: 'chat/:userId?',
                parse: {
                    userId: (value: string) => {
                        const parsed = Number.parseInt(String(value || ''), 10);
                        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
                    },
                    name: (value: string) => value,
                },
            },
            RoomInviteEntry: {
                path: 'rooms/join/:token',
                parse: {
                    token: (value: string) => value,
                },
            },
            Wallet: 'wallet',
            SupportHome: 'support',
            SupportTicketForm: 'support/ticket',
            SupportInbox: 'support/inbox',
            SupportConversation: {
                path: 'support/conversation/:conversationId',
                parse: {
                    conversationId: (id: string) => Number(id),
                },
            },
        },
    },
};
