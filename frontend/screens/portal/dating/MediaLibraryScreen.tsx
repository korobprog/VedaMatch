import React, { useState, useEffect } from 'react';
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
    const { userId, readOnly } = route.params as any;
    const { user: currentUser } = useUser();
    const { t } = useTranslation();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(currentUser?.role, isDarkMode);
    const theme = {
        background: colors.background,
        borderColor: colors.border,
        text: colors.textPrimary,
        subText: colors.textSecondary,
        accent: colors.accent,
    };
    const [photos, setPhotos] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Media | null>(null);

    // Determine if user can edit (is own profile and not explicitly readOnly)
    const canEdit = !readOnly && (currentUser?.ID === userId);

    useEffect(() => {
        fetchPhotos();
    }, []);

    const fetchPhotos = async () => {
        try {
            const data = await datingService.getPhotos(userId);
            setPhotos(data);
        } catch (error) {
            console.error('Failed to fetch photos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPhoto = () => {
        if (!canEdit) return;
        Alert.alert(
            t('common.confirm'),
            t('chat.chooseAction'),
            [
                {
                    text: t('registration.camera' as any) || 'Камера',
                    onPress: () => launchCamera({ mediaType: 'photo' }, onPhotoSelected),
                },
                {
                    text: t('registration.gallery' as any) || 'Галерея',
                    onPress: () => launchImageLibrary({ mediaType: 'photo' }, onPhotoSelected),
                },
                { text: t('common.cancel'), style: 'cancel' },
            ]
        );
    };

    const onPhotoSelected = async (response: any) => {
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
                Alert.alert('Error', 'Failed to upload photo');
                console.error(error);
            } finally {
                setUploading(false);
            }
        }
    };

    const handlePhotoOptions = (photo: Media) => {
        if (!canEdit) return;
        Alert.alert(
            'Photo Options',
            'Choose an action',
            [
                {
                    text: t('dating.setAsProfile' as any) || 'Сделать главным',
                    onPress: () => setProfilePicture(photo.ID),
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deletePhoto(photo.ID),
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const setProfilePicture = async (id: number) => {
        try {
            await datingService.setProfilePhoto(id);
            fetchPhotos();
        } catch (error) {
            Alert.alert('Error', 'Failed to set profile picture');
        }
    };

    const deletePhoto = async (id: number) => {
        try {
            await datingService.deletePhoto(id);
            fetchPhotos();
        } catch (error) {
            Alert.alert(t('common.error'), t('common.error'));
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
                style={[styles.photo, item.isProfile && { borderColor: theme.accent, borderWidth: 3 }]}
            />
            {item.isProfile && (
                <View style={[styles.profileBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.profileBadgeText}>{t('dating.mainPhotoBadge')}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const renderHeader = () => (
        canEdit ? (
            <View style={{ padding: 12, paddingBottom: 0 }}>
                <Text style={{ color: theme.subText, fontSize: 13, marginBottom: 8 }}>
                    {t('dating.longPressOptions')}
                </Text>
            </View>
        ) : null
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={{ color: theme.text, fontSize: 18 }}>← {t('common.back')}</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{canEdit ? t('settings.tabs.chat').replace('Чат', 'Медиа') : t('contacts.media')}</Text>
                {canEdit ? (
                    <TouchableOpacity onPress={handleAddPhoto} disabled={uploading}>
                        {uploading ? <ActivityIndicator color={theme.accent} /> : <Text style={{ color: theme.accent, fontSize: 18 }}>{t('common.save').replace('Сохранить', 'Добавить')}</Text>}
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.accent} />
            ) : (
                <FlatList
                    ListHeaderComponent={renderHeader}
                    data={photos}
                    keyExtractor={(item) => item.ID.toString()}
                    renderItem={renderPhoto}
                    numColumns={3}
                    contentContainerStyle={styles.list}
                    ListFooterComponent={
                        canEdit ? (
                            <TouchableOpacity
                                style={styles.addPhotoTile}
                                onPress={handleAddPhoto}
                            >
                                <Text style={{ fontSize: 30, color: theme.accent }}>+</Text>
                                <Text style={{ color: theme.accent, fontSize: 12, marginTop: 4 }}>{t('dating.addPhoto')}</Text>
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
                        <Text style={{ color: 'white', fontSize: 24 }}>✕</Text>
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
        paddingTop: 50,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        padding: 12,
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
    centerImage: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
