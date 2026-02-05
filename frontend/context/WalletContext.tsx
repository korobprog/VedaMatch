/**
 * WalletContext - Глобальный контекст для кошелька
 */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
    WalletResponse,
    getWalletBalance,
    formatBalance,
    getCurrencyName,
} from '../services/walletService';
import { useUser } from './UserContext';

interface WalletContextType {
    wallet: WalletResponse | null;
    loading: boolean;
    error: string | null;
    refreshWallet: () => Promise<void>;
    formattedBalance: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
    children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
    const { user } = useUser();
    const [wallet, setWallet] = useState<WalletResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshWallet = useCallback(async () => {
        if (!user) {
            setWallet(null);
            return;
        }


        setLoading(true);
        setError(null);

        try {
            const data = await getWalletBalance();
            setWallet(data);
        } catch (err) {
            console.warn('[Wallet] Failed to fetch balance:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch wallet');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Load wallet when user logs in
    useEffect(() => {
        if (user) {
            refreshWallet();
        } else {
            setWallet(null);
        }
    }, [user, refreshWallet]);

    const formattedBalance = wallet ? formatBalance(wallet.balance) : `0 ${getCurrencyName(user?.language)}`;

    const value: WalletContextType = {
        wallet,
        loading,
        error,
        refreshWallet,
        formattedBalance,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet(): WalletContextType {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

export default WalletContext;
