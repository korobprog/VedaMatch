import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: 2,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
            networkMode: 'online',
        },
        mutations: {
            retry: 1,
            networkMode: 'online',
        },
    },
});
