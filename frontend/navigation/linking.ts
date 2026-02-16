import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

export const linking: LinkingOptions<RootStackParamList> = {
    prefixes: ['vedamatch://', 'https://vedamatch.ru', 'https://www.vedamatch.ru'],
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
