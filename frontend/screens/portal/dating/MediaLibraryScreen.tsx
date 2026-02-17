import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../../types/navigation';
import { useUser } from '../../../context/UserContext';
import { datingService } from '../../../services/datingService';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 3;

type Props = NativeStackScreenProps<RootStackParamList, 'MediaLibrary'>;

interface Media {
    ID: number;
    url: string;
    isProfile: boolean;
}

export const MediaLibraryScreen: React.FC<Props> = ({ navigation, route }) => {
    const { userId, readOnly } = route.params;
    const { user: currentUser } = useUser();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(currentUser?.role, isDarkMode);
    const theme = {
        background: colors.background,
        borderColor: colors.border,
        text: colors.textPrimary,
        subText: colors.textSecondary,
        accent: colors.accent,
    };
    const themedStyles = useMemo(() => ({
        header: { borderBottomColor: theme.borderColor, paddingTop: insets.top + 10 },
        backText: { color: theme.text },
        title: { color: theme.text },
        accentText: { color: theme.accent },
        subtitleText: { color: theme.subText },
        profileBadge: { backgroundColor: theme.accent },
        profileBorder: { borderColor: theme.accent },
        emptyTitle: { color: theme.text },
        emptyHint: { color: theme.subText },
    }), [theme.accent, theme.borderColor, theme.subText, theme.text, insets.top]);
    const [photos, setPhotos] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Media | null>(null);

    // Determine if user can edit (is own profile and not explicitly readOnly)
    const canEdit = !readOnly && (currentUser?.ID === userId);

    const fetchPhotos = useCallback(async () => {
        try {
            const data = await datingService.getPhotos(userId);
            setPhotos(data);
        } catch (error) {
            console.error('Failed to fetch photos:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchPhotos();
    }, [fetchPhotos]);

    const handleAddPhoto = () => {
        if (!canEdit) return;
        Alert.alert(
            t('common.confirm'),
            t('chat.chooseAction'),
            [
                {
                    text: t('registration.camera', { defaultValue: t('common.camera', { defaultValue: 'Camera' }) }),
                    onPress: () => launchCamera({ mediaType: 'photo' }, onPhotoSelected),
                },
                {
                    text: t('registration.gallery', { defaultValue: t('common.gallery', { defaultValue: 'Gallery' }) }),
                    onPress: () => launchImageLibrary({ mediaType: 'photo' }, onPhotoSelected),
                },
                { text: t('common.cancel'), style: 'cancel' },
            ]
        );
    };

    const onPhotoSelected = async (response: any) => {
        if (response?.didCancel) {
            return;
        }

        if (response?.errorCode) {
            Alert.alert(t('common.error'), response.errorMessage || t('dating.uploadFailed'));
            return;
        }

        if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            const formData = new FormData();
            formData.append('photo', {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: asset.fileName || `photo_${Date.now()}.jpg`,
            } as any);

            setUploading(true);
            try {
                await datingService.uploadPhoto(userId, formData);
                fetchPhotos();
            } catch (error) {
                Alert.alert(t('common.error'), t('dating.uploadFailed'));
                console.error(error);
            } finally {
                setUploading(false);
            }
        }
    };

    const handlePhotoOptions = (photo: Media) => {
        if (!canEdit) return;
        Alert.alert(
            t('dating.photoOptionsTitle'),
            t('chat.chooseAction'),
            [
                {
                    text: t('dating.setAsProfile'),
                    onPress: () => setProfilePicture(photo.ID),
                },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => confirmDeletePhoto(photo.ID),
                },
                { text: t('common.cancel'), style: 'cancel' },
            ]
        );
    };

    const setProfilePicture = async (id: number) => {
        try {
            await datingService.setProfilePhoto(id);
            fetchPhotos();
        } catch {
            Alert.alert(t('common.error'), t('dating.setProfileFailed'));
        }
    };

    const confirmDeletePhoto = (id: number) => {
        Alert.alert(
            t('common.confirm'),
            t('dating.deletePhotoConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => deletePhoto(id),
                },
            ]
        );
    };

    const deletePhoto = async (id: number) => {
        try {
            await datingService.deletePhoto(id);
            fetchPhotos();
        } catch {
            Alert.alert(t('common.error'), t('dating.deleteFailed'));
        }
    };

    const handleSelectPhoto = (photo: Media) => {
        setSelectedPhoto(photo);
    };

    const renderPhoto = ({ item }: { item: Media }) => (
        <TouchableOpacity
            style={styles.photoContainer}
            onPress={() => handleSelectPhoto(item)}
            onLongPress={() => handlePhotoOptions(item)}
            delayLongPress={500}
        >
            <Image
                source={{ uri: `${datingService.getMediaUrl(item.url)}` }}
                style={[styles.photo, item.isProfile && styles.profilePhotoBorder, item.isProfile && themedStyles.profileBorder]}
            />
            {item.isProfile && (
                <View style={[styles.profileBadge, themedStyles.profileBadge]}>
                    <Text style={styles.profileBadgeText}>{t('dating.mainPhotoBadge')}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderHeader = () => (
        canEdit ? (
            <View style={styles.headerHintContainer}>
                <Text style={[styles.headerHintText, themedStyles.subtitleText]}>
                    {t('dating.longPressOptions')}
                </Text>
            </View>
        ) : null
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, themedStyles.emptyTitle]}>{t('dating.noMediaYet')}</Text>
            <Text style={[styles.emptyHint, themedStyles.emptyHint]}>
                {canEdit ? t('dating.addFirstPhoto') : t('dating.noPhotos')}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, themedStyles.header]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={[styles.backText, themedStyles.backText]}>← {t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={[styles.title, themedStyles.title]}>{t('dating.media')}</Text>
                {canEdit ? (
                    <TouchableOpacity onPress={handleAddPhoto} disabled={uploading}>
                        {uploading ? <ActivityIndicator color={theme.accent} /> : <Text style={[styles.headerActionText, themedStyles.accentText]}>{t('common.add')}</Text>}
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            {loading ? (
                <ActivityIndicator style={styles.loadingIndicator} size="large" color={theme.accent} />
            ) : (
                <FlatList
                    ListHeaderComponent={renderHeader}
                    data={photos}
                    keyExtractor={(item) => item.ID.toString()}
                    renderItem={renderPhoto}
                    numColumns={3}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={renderEmptyState}
                    ListFooterComponent={
                        canEdit ? (
                            <TouchableOpacity
                                style={styles.addPhotoTile}
                                onPress={handleAddPhoto}
                            >
                                <Text style={[styles.addTilePlus, themedStyles.accentText]}>+</Text>
                                <Text style={[styles.addTileLabel, themedStyles.accentText]}>{t('dating.addPhoto')}</Text>
                            </TouchableOpacity>
                        ) : null
                    }
                />
            )}

            {/* Photo Viewer Modal */}
            <Modal
                visible={!!selectedPhoto}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedPhoto(null)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.closeModalBtn}
                        onPress={() => setSelectedPhoto(null)}
                    >
                        <Text style={styles.closeModalText}>✕</Text>
                    </TouchableOpacity>

                    <ScrollView
                        maximumZoomScale={3}
                        minimumZoomScale={1}
                        contentContainerStyle={styles.centerImage}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                    >
                        {selectedPhoto && (
                            <Image
                                source={{ uri: `${datingService.getMediaUrl(selectedPhoto.url)}` }}
                                style={{ width: width, height: width * 1.5 }}
                                resizeMode="contain"
                            />
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 5,
    },
    backText: {
        fontSize: 18,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerActionText: {
        fontSize: 18,
    },
    headerSpacer: {
        width: 40,
    },
    loadingIndicator: {
        flex: 1,
    },
    headerHintContainer: {
        padding: 12,
        paddingBottom: 0,
    },
    headerHintText: {
        fontSize: 13,
        marginBottom: 8,
    },
    list: {
        padding: 12,
        flexGrow: 1,
    },
    photoContainer: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH,
        margin: 6,
        borderRadius: 8,
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    profilePhotoBorder: {
        borderWidth: 3,
    },
    profileBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    profileBadgeText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 10,
        fontWeight: 'bold',
    },
    addPhotoTile: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH,
        margin: 6,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(204,204,204,1)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addTilePlus: {
        fontSize: 30,
    },
    addTileLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeModalBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    closeModalText: {
        color: 'white',
        fontSize: 24,
    },
    centerImage: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    emptyHint: {
        fontSize: 13,
        textAlign: 'center',
    }
});
