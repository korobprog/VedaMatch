import { Image } from 'react-native';

export interface WallpaperPreset {
    id: string;
    source: any; // require() result
    uri: string;
}

const presetSources = [
    { id: 'fon_1', source: require('../assets/fon/1be7ff4bb6eedc0d2a41e0c7421d64ea.jpg') },
    { id: 'fon_2', source: require('../assets/fon/216af7058f88766a17c25e4f27525975.jpg') },
    { id: 'fon_3', source: require('../assets/fon/63be873bbaf3c35b4b2f49628d4d8d5b.jpg') },
    { id: 'fon_4', source: require('../assets/fon/b9675e71a191bcb64703677dd6ec8dd1.jpg') },
];

export const WALLPAPER_PRESETS: WallpaperPreset[] = presetSources.map(p => ({
    ...p,
    uri: Image.resolveAssetSource(p.source).uri,
}));

export const getPresetUris = (): string[] => WALLPAPER_PRESETS.map(p => p.uri);

export const isPresetUri = (uri: string): boolean =>
    WALLPAPER_PRESETS.some(p => p.uri === uri);

export const SLIDESHOW_INTERVALS = [
    { label: '10 сек', value: 10 },
    { label: '30 сек', value: 30 },
    { label: '1 мин', value: 60 },
    { label: '5 мин', value: 300 },
    { label: '15 мин', value: 900 },
];

export const DEFAULT_SLIDESHOW_INTERVAL = 30; // seconds
