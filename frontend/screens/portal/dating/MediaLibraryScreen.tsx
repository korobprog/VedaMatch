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
    useColorScheme,
    Dimensions
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import { API_PATH } from '../../../config/api.config';
import { COLORS } from '../../../components/chat/ChatConstants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 3;

type Props = NativeStackScreenProps<RootStackParamList, 'MediaLibrary'>;

interface Media {
    ID: number;
    url: string;
    isProfile: boolean;
}

export const MediaLibraryScreen: React.FC<Props> = ({ navigation, route }) => {
    const { userId } = route.params;
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const [photos, setPhotos] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchPhotos();
    }, []);

    const fetchPhotos = async () => {
        try {
            const response = await axios.get(`${API_PATH}/media/${userId}`);
            setPhotos(response.data);
        } catch (error) {
            console.error('Failed to fetch photos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPhoto = () => {
        Alert.alert(
            'Upload Photo',
            'Choose an option',
            [
                {
                    text: 'Camera',
                    onPress: () => launchCamera({ mediaType: 'photo' }, onPhotoSelected),
                },
                {
                    text: 'Gallery',
                    onPress: () => launchImageLibrary({ mediaType: 'photo' }, onPhotoSelected),
                },
                { text: 'Cancel', style: 'cancel' },
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
                await axios.post(`${API_PATH}/media/upload/${userId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
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
        Alert.alert(
            'Photo Options',
            'Choose an action',
            [
                {
                    text: 'Set as Profile Picture',
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
            await axios.post(`${API_PATH}/media/${id}/set-profile`);
            fetchPhotos();
        } catch (error) {
            Alert.alert('Error', 'Failed to set profile picture');
        }
    };

    const deletePhoto = async (id: number) => {
        try {
            await axios.delete(`${API_PATH}/media/${id}`);
            fetchPhotos();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete photo');
        }
    };

    const renderPhoto = ({ item }: { item: Media }) => (
        <TouchableOpacity
            style={styles.photoContainer}
            onPress={() => handlePhotoOptions(item)}
        >
            <Image
                source={{ uri: `${API_PATH.replace('/api', '')}${item.url}` }}
                style={[styles.photo, item.isProfile && { borderColor: theme.accent, borderWidth: 3 }]}
            />
            {item.isProfile && (
                <View style={[styles.profileBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.profileBadgeText}>Main</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={{ color: theme.text, fontSize: 18 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Media Library</Text>
                <TouchableOpacity onPress={handleAddPhoto} disabled={uploading}>
                    {uploading ? <ActivityIndicator color={theme.accent} /> : <Text style={{ color: theme.accent, fontSize: 18 }}>Add</Text>}
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.accent} />
            ) : (
                <FlatList
                    data={photos}
                    keyExtractor={(item) => item.ID.toString()}
                    renderItem={renderPhoto}
                    numColumns={3}
                    contentContainerStyle={styles.list}
                />
            )}
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
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    }
});
