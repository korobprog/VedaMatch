import React, { createContext, useState, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { modelsConfig } from '../config/models.config';
import { useUser } from './UserContext';
import { Alert, useColorScheme, Image, AppState } from 'react-native';
import { COLORS } from '../components/chat/ChatConstants';
import { VedicLightTheme, VedicDarkTheme } from '../theme/ModernVedicTheme';
import { getPresetUris, DEFAULT_SLIDESHOW_INTERVAL } from '../config/wallpaperPresets';

export type ThemeMode = 'light' | 'dark' | 'system';

interface Model {
    id: string;
    object: string;
    created: number;
    owned_by: string;
    provider: string;
    category?: string;
}

interface SettingsContextType {
    models: Model[];
    currentModel: string;
    currentProvider: string;
    loadingModels: boolean;
    imageSize: number;
    imagePosition: 'left' | 'center' | 'right';
    fetchModels: (force?: boolean) => Promise<void>;
    selectModel: (modelId: string, provider: string) => void;
    setImageSize: (size: number) => void;
    setImagePosition: (position: 'left' | 'center' | 'right') => void;
    assistantType: 'feather' | 'smiley' | 'feather2';
    setAssistantType: (type: 'feather' | 'smiley' | 'feather2') => Promise<void>;

    theme: typeof COLORS.dark;
    vTheme: typeof VedicLightTheme;
    isDarkMode: boolean;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    isAutoMagicEnabled: boolean;
    toggleAutoMagic: () => void;
    isMenuOpen: boolean;
    setIsMenuOpen: (isOpen: boolean) => void;
    portalBackground: string;
    portalBackgroundType: 'color' | 'gradient' | 'image';
    setPortalBackground: (bg: string, type: 'color' | 'gradient' | 'image') => Promise<void>;
    isSettingsLoaded: boolean;
    // Wallpaper slideshow
    wallpaperSlides: string[];
    isSlideshowEnabled: boolean;
    slideshowInterval: number;
    currentSlideIndex: number;
    setIsSlideshowEnabled: (enabled: boolean) => Promise<void>;
    setSlideshowInterval: (seconds: number) => Promise<void>;
    addWallpaperSlide: (uri: string) => Promise<void>;
    removeWallpaperSlide: (uri: string) => Promise<void>;
    activeWallpaper: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [models, setModels] = useState<Model[]>([]);
    const [currentModel, setCurrentModel] = useState<string>(modelsConfig.text.model);
    const [currentProvider, setCurrentProvider] = useState<string>(modelsConfig.text.provider || '');
    const [loadingModels, setLoadingModels] = useState<boolean>(false);
    const [lastFetchTime, setLastFetchTime] = useState<number>(0);
    const [imageSize, setImageSize] = useState<number>(280);
    const [imagePosition, setImagePosition] = useState<'left' | 'center' | 'right'>('left');

    const [isAutoMagicEnabled, setIsAutoMagicEnabled] = useState<boolean>(true);
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    // Default background
    const defaultBgImage = Image.resolveAssetSource(require('../assets/vedamatch_bg.png')).uri;
    const [portalBackground, setPortalBackgroundState] = useState<string>(defaultBgImage);
    const [portalBackgroundType, setPortalBackgroundType] = useState<'color' | 'gradient' | 'image'>('image');
    const [assistantType, setAssistantTypeState] = useState<'feather' | 'smiley' | 'feather2'>('feather2');

    // Wallpaper slideshow state
    const [wallpaperSlides, setWallpaperSlides] = useState<string[]>(getPresetUris());
    const [isSlideshowEnabled, setIsSlideshowEnabledState] = useState<boolean>(true);
    const [slideshowInterval, setSlideshowIntervalState] = useState<number>(DEFAULT_SLIDESHOW_INTERVAL);
    const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
    const slideshowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const colorScheme = useColorScheme();

    // Resolve dark mode based on setting or system
    const isDarkMode = themeMode === 'system'
        ? colorScheme === 'dark'
        : themeMode === 'dark';

    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const vTheme = isDarkMode ? VedicDarkTheme : VedicLightTheme;

    const { isLoggedIn } = useUser();

    const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

    const fetchModels = async (force: boolean = false) => {
        const now = Date.now();
        // Cache check: if we have models and not forcing update, check if cache is valid (10 min)
        if (models.length > 0 && !force && (now - lastFetchTime < CACHE_DURATION)) {
            console.log('Using cached models list (valid for 10 min)');
            return;
        }

        if (!isLoggedIn) {
            console.log('Skipping model fetch: User not logged in');
            return;
        }

        setLoadingModels(true);
        try {
            // Lazy import to avoid potential circular dependencies and ensure we have auth headers
            const { getAvailableModels } = require('../services/openaiService');
            const data = await getAvailableModels();

            // Store ALL unique models, let UI handle categorization
            const allModels = data.data || [];

            // Deduplicate by ID
            const uniqueModels = allModels.filter((model: any, index: number, self: any[]) =>
                index === self.findIndex((t) => t.id === model.id)
            );

            // Sort by ID
            const sortedModels = uniqueModels.sort((a: any, b: any) =>
                a.id.localeCompare(b.id)
            );

            setModels(sortedModels);
            setLastFetchTime(Date.now());
            console.log('Models loaded and cached:', sortedModels.length);

            // Validate current model exists in new list, if not, fallback or warn
            // (Optional: logic to reset if current model disappears)
        } catch (error: any) {
            console.warn('Failed to fetch models:', error?.message || 'Unknown error');
            // Silent failure, UI will show empty list or use defaults
        } finally {
            setLoadingModels(false);
        }
    };

    const selectModel = (modelId: string, provider: string) => {
        setCurrentModel(modelId);
        setCurrentProvider(provider);
        console.log(`Model switched to: ${modelId} (${provider})`);
    };

    const toggleAutoMagic = async () => {
        const newValue = !isAutoMagicEnabled;
        setIsAutoMagicEnabled(newValue);
        try {
            await AsyncStorage.setItem('auto_magic_enabled', JSON.stringify(newValue));
        } catch (e) {
            console.error('Failed to save auto magic settings', e);
        }
    };

    // Initial fetch on mount? 
    // Maybe better to lazy load when drawer opens, but user asked for "cached list".
    // We can fetch on app start silently.
    const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const autoMagic = await AsyncStorage.getItem('auto_magic_enabled');
                if (autoMagic !== null && autoMagic !== 'undefined' && autoMagic !== 'null') {
                    setIsAutoMagicEnabled(JSON.parse(autoMagic));
                }

                const savedThemeMode = await AsyncStorage.getItem('theme_mode');
                if (savedThemeMode === 'light' || savedThemeMode === 'dark' || savedThemeMode === 'system') {
                    setThemeModeState(savedThemeMode as ThemeMode);
                }

                const savedBg = await AsyncStorage.getItem('portal_background');
                const savedBgType = await AsyncStorage.getItem('portal_background_type');

                if (savedBg && savedBg !== 'undefined' && savedBg !== 'null') {
                    setPortalBackgroundState(savedBg);
                } else {
                    setPortalBackgroundState(defaultBgImage);
                }

                if (savedBgType === 'color' || savedBgType === 'gradient' || savedBgType === 'image') {
                    setPortalBackgroundType(savedBgType as any);
                } else if (!savedBgType) {
                    setPortalBackgroundType('image');
                }

                const savedAssistant = await AsyncStorage.getItem('assistant_type');
                if (savedAssistant === 'feather' || savedAssistant === 'smiley' || savedAssistant === 'feather2') {
                    setAssistantTypeState(savedAssistant as any);
                } else if (savedAssistant === 'nanobanano') {
                    setAssistantTypeState('feather2');
                }

                // Wallpaper slideshow settings
                const savedSlides = await AsyncStorage.getItem('wallpaper_slides');
                if (savedSlides) {
                    try {
                        const parsed = JSON.parse(savedSlides);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setWallpaperSlides(parsed);
                        }
                    } catch { /* keep defaults */ }
                }

                const savedSlideshowEnabled = await AsyncStorage.getItem('slideshow_enabled');
                if (savedSlideshowEnabled !== null) {
                    try {
                        setIsSlideshowEnabledState(JSON.parse(savedSlideshowEnabled));
                    } catch { /* keep default */ }
                }

                const savedInterval = await AsyncStorage.getItem('slideshow_interval');
                if (savedInterval !== null) {
                    try {
                        const val = JSON.parse(savedInterval);
                        if (typeof val === 'number' && val > 0) {
                            setSlideshowIntervalState(val);
                        }
                    } catch { /* keep default */ }
                }
            } catch (e) {
                console.error('Failed to load menu settings', e);
            } finally {
                setIsSettingsLoaded(true);
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchModels();
        }
    }, [isLoggedIn]);

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem('theme_mode', mode);
        } catch (e) {
            console.error('Failed to save theme setting', e);
        }
    };

    const setPortalBackground = async (bg: string, type: 'color' | 'gradient' | 'image') => {
        setPortalBackgroundState(bg);
        setPortalBackgroundType(type);
        try {
            await AsyncStorage.setItem('portal_background', bg);
            await AsyncStorage.setItem('portal_background_type', type);
        } catch (e) {
            console.error('Failed to save portal background', e);
        }
    };

    const setAssistantType = async (type: 'feather' | 'smiley' | 'feather2') => {
        setAssistantTypeState(type);
        try {
            await AsyncStorage.setItem('assistant_type', type);
        } catch (e) {
            console.error('Failed to save assistant type', e);
        }
    };

    // Wallpaper slideshow functions
    const setIsSlideshowEnabled = useCallback(async (enabled: boolean) => {
        setIsSlideshowEnabledState(enabled);
        if (enabled && wallpaperSlides.length > 0) {
            setPortalBackgroundState(wallpaperSlides[0]);
            setPortalBackgroundType('image');
            setCurrentSlideIndex(0);
        }
        try {
            await AsyncStorage.setItem('slideshow_enabled', JSON.stringify(enabled));
        } catch (e) {
            console.error('Failed to save slideshow setting', e);
        }
    }, [wallpaperSlides]);

    const setSlideshowInterval = useCallback(async (seconds: number) => {
        setSlideshowIntervalState(seconds);
        try {
            await AsyncStorage.setItem('slideshow_interval', JSON.stringify(seconds));
        } catch (e) {
            console.error('Failed to save slideshow interval', e);
        }
    }, []);

    const addWallpaperSlide = useCallback(async (uri: string) => {
        setWallpaperSlides(prev => {
            if (prev.includes(uri)) return prev;
            const updated = [...prev, uri];
            AsyncStorage.setItem('wallpaper_slides', JSON.stringify(updated)).catch(console.error);
            return updated;
        });
    }, []);

    const removeWallpaperSlide = useCallback(async (uri: string) => {
        setWallpaperSlides(prev => {
            const updated = prev.filter(s => s !== uri);
            AsyncStorage.setItem('wallpaper_slides', JSON.stringify(updated)).catch(console.error);
            return updated;
        });
    }, []);

    // Slideshow timer effect
    useEffect(() => {
        if (slideshowTimerRef.current) {
            clearInterval(slideshowTimerRef.current);
            slideshowTimerRef.current = null;
        }

        if (!isSlideshowEnabled || wallpaperSlides.length < 2) return;

        slideshowTimerRef.current = setInterval(() => {
            setCurrentSlideIndex(prev => {
                const nextIdx = (prev + 1) % wallpaperSlides.length;
                setPortalBackgroundState(wallpaperSlides[nextIdx]);
                setPortalBackgroundType('image');
                return nextIdx;
            });
        }, slideshowInterval * 1000);

        return () => {
            if (slideshowTimerRef.current) {
                clearInterval(slideshowTimerRef.current);
            }
        };
    }, [isSlideshowEnabled, wallpaperSlides, slideshowInterval]);

    // Pause slideshow when app is in background
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state !== 'active' && slideshowTimerRef.current) {
                clearInterval(slideshowTimerRef.current);
                slideshowTimerRef.current = null;
            }
            // Timer restarts via the dependency effect above on next render
        });
        return () => sub.remove();
    }, []);

    // Derived values used by UI
    const activeWallpaper = isSlideshowEnabled && wallpaperSlides.length > 0
        ? wallpaperSlides[currentSlideIndex % wallpaperSlides.length]
        : portalBackground;
    const effectivePortalBackgroundType: 'color' | 'gradient' | 'image' =
        isSlideshowEnabled ? 'image' : portalBackgroundType;

    return (
        <SettingsContext.Provider value={{
            models,
            currentModel,
            currentProvider,
            loadingModels,
            fetchModels,
            selectModel,
            imageSize,
            imagePosition,
            setImageSize,
            setImagePosition,

            theme,
            vTheme,
            isDarkMode,
            themeMode,
            setThemeMode,
            isAutoMagicEnabled,
            toggleAutoMagic,
            isMenuOpen,
            setIsMenuOpen,
            portalBackground,
            portalBackgroundType: effectivePortalBackgroundType,
            setPortalBackground,
            assistantType,
            setAssistantType,
            isSettingsLoaded,
            wallpaperSlides,
            isSlideshowEnabled,
            slideshowInterval,
            currentSlideIndex,
            setIsSlideshowEnabled,
            setSlideshowInterval,
            addWallpaperSlide,
            removeWallpaperSlide,
            activeWallpaper,
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
