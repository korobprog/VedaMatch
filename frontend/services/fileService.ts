import { Platform, PermissionsAndroid, Alert, Linking, Share } from 'react-native';
import RNFS from 'react-native-fs';
import i18n from '../i18n';

export const shareImage = async (url: string) => {
    try {
        await Share.share({
            message: i18n.t('file.shareMessage'),
            url: url,
            title: i18n.t('file.shareTitle'),
        });
    } catch (error: any) {
        console.error('Ошибка при шаринге:', error);
        Alert.alert(i18n.t('common.error'), i18n.t('file.shareError'));
    }
};

export const downloadImage = async (imageUrl: string, imageName?: string) => {
    try {
        if (Platform.OS === 'android' && Platform.Version < 29) {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                {
                    title: i18n.t('file.permissionTitle'),
                    message: i18n.t('file.permissionMsg'),
                    buttonNeutral: i18n.t('common.cancel'), // Neutral usually means ignore/later
                    buttonNegative: i18n.t('common.cancel'),
                    buttonPositive: i18n.t('common.ok'),
                }
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                Alert.alert(i18n.t('common.error'), i18n.t('file.permissionDenied'));
                return;
            }
        }

        const fileName = imageName || `image_${Date.now()}.jpg`;
        const fileExtension = fileName.split('.').pop() || 'jpg';
        const finalFileName = fileName.includes('.') ? fileName : `${fileName}.${fileExtension}`;

        const downloadPath = Platform.OS === 'ios'
            ? `${RNFS.DocumentDirectoryPath}/${finalFileName}`
            : (typeof Platform.Version === 'number' && Platform.Version >= 29)
                ? `${RNFS.DownloadDirectoryPath}/${finalFileName}`
                : `${RNFS.PicturesDirectoryPath}/${finalFileName}`;

        const downloadResult = await RNFS.downloadFile({
            fromUrl: imageUrl,
            toFile: downloadPath,
        }).promise;

        if (downloadResult.statusCode === 200) {
            Alert.alert(i18n.t('common.success'), i18n.t('file.downloadSuccess'), [{ text: i18n.t('common.ok') }]);
        } else {
            throw new Error(`Download error: ${downloadResult.statusCode}`);
        }
    } catch (error: any) {
        console.error('Ошибка при скачивании изображения:', error);
        Alert.alert(
            i18n.t('common.error'),
            i18n.t('file.downloadError'),
            [
                { text: i18n.t('common.cancel'), style: 'cancel' },
                {
                    text: i18n.t('file.openInBrowser'),
                    onPress: () => Linking.openURL(imageUrl).catch(() => {
                        Alert.alert(i18n.t('common.error'), 'Failed to open image');
                    }),
                },
            ]
        );
    }
};
