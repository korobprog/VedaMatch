import { CommonActions } from '@react-navigation/native';
import type { AiNavigationMeta, RootStackParamList } from '../types/navigation';

type NavigationLike = {
    canGoBack: () => boolean;
    goBack: () => void;
    navigate: (name: keyof RootStackParamList, params?: any) => void;
    dispatch: (action: any) => void;
    getState: () => { routes?: Array<{ name?: string }> } | undefined;
};

const AI_LIBRARY_STACK_ROUTES = new Set(['LibraryHome', 'BookList', 'Reader']);

export const withAiNavigationMeta = <T extends Record<string, unknown> | undefined>(
    params: T,
    returnTo: 'chat' | 'portal' = 'chat',
): (T extends undefined ? {} : T) & AiNavigationMeta => ({
    ...(params || {}),
    origin: 'ai_chat',
    returnTo,
}) as (T extends undefined ? {} : T) & AiNavigationMeta;

export const resolveAiBackTarget = (
    navigation: NavigationLike,
    meta?: AiNavigationMeta,
): 'stack' | 'chat' | 'portal' | null => {
    if (meta?.origin !== 'ai_chat') {
        return navigation.canGoBack() ? 'stack' : null;
    }

    const routes = navigation.getState()?.routes || [];
    const previousRouteName = routes.length > 1 ? routes[routes.length - 2]?.name : undefined;
    if (previousRouteName && AI_LIBRARY_STACK_ROUTES.has(previousRouteName)) {
        return 'stack';
    }

    return meta.returnTo === 'portal' ? 'portal' : 'chat';
};

export const handleAiBackNavigation = (
    navigation: NavigationLike,
    meta?: AiNavigationMeta,
    portalParams?: RootStackParamList['Portal'],
) => {
    const target = resolveAiBackTarget(navigation, meta);
    const routes = navigation.getState()?.routes || [];
    const previousRouteName = routes.length > 1 ? routes[routes.length - 2]?.name : undefined;

    if (target === 'stack') {
        navigation.goBack();
        return;
    }
    if (target === 'portal') {
        if (navigation.canGoBack() && previousRouteName === 'Portal') {
            navigation.goBack();
            return;
        }
        navigation.dispatch(CommonActions.reset({
            index: 0,
            routes: [{ name: 'Portal', params: portalParams }],
        }));
        return;
    }
    if (target === 'chat') {
        if (navigation.canGoBack() && previousRouteName === 'Chat') {
            navigation.goBack();
            return;
        }
        navigation.dispatch(CommonActions.reset({
            index: 0,
            routes: [{ name: 'Chat' }],
        }));
        return;
    }

    if (navigation.canGoBack()) {
        navigation.goBack();
        return;
    }

    navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: 'Portal', params: portalParams }],
    }));
};
