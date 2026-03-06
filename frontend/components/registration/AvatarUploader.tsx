import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet, Alert, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Camera } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

interface AvatarUploaderProps {
    avatar: any;
    onAvatarChange: (asset: any) => void;
    theme: any;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({ avatar, onAvatarChange, theme: _theme }) => {
    const { i18n } = useTranslation();
    const copy = i18n.language?.startsWith('ru')
        ? {
            uploadPhoto: 'Загрузить фото',
            chooseSource: 'Выберите источник',
            camera: 'Камера',
            gallery: 'Галерея',
            cancel: 'Отмена',
            addPhoto: 'Добавить фото',
        }
        : i18n.language?.startsWith('hi')
            ? {
                uploadPhoto: 'फ़ोटो अपलोड करें',
                chooseSource: 'स्रोत चुनें',
                camera: 'कैमरा',
                gallery: 'गैलरी',
                cancel: 'रद्द करें',
                addPhoto: 'फ़ोटो जोड़ें',
            }
            : {
                uploadPhoto: 'Upload Photo',
                chooseSource: 'Choose source',
                camera: 'Camera',
                gallery: 'Gallery',
                cancel: 'Cancel',
                addPhoto: 'Add Photo',
            };
    const handleChooseAvatar = () => {
        Alert.alert(
            copy.uploadPhoto,
            copy.chooseSource,
            [
                {
                    text: copy.camera,
                    onPress: () => {
                        launchCamera({ mediaType: 'photo', cameraType: 'front', saveToPhotos: true }, (response) => {
                            if (response.assets && response.assets.length > 0) {
                                onAvatarChange(response.assets[0]);
                            }
                        });
                    },
                },
                {
                    text: copy.gallery,
                    onPress: () => {
                        launchImageLibrary({ mediaType: 'photo' }, (response) => {
                            if (response.assets && response.assets.length > 0) {
                                onAvatarChange(response.assets[0]);
                            }
                        });
                    },
                },
                { text: copy.cancel, style: 'cancel' },
            ]
        );
    };

    return (
        <View style={styles.outerContainer}>
            <TouchableOpacity
                onPress={handleChooseAvatar}
                style={[
                    styles.avatarContainer,
                    !avatar && styles.dashedBorder
                ]}
                activeOpacity={0.8}
            >
                {avatar ? (
                    <Image source={{ uri: avatar.uri }} style={styles.avatarImage} />
                ) : (
                    <View style={styles.placeholder}>
                        <Camera size={28} color="#FFB74D" strokeWidth={1.5} />
                        <Text style={styles.placeholderText}>{copy.addPhoto}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        alignItems: 'center',
        marginVertical: 24,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,183,77,0.05)',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dashedBorder: {
        borderWidth: 1.5,
        borderColor: 'rgba(255,183,77,0.4)',
        borderStyle: 'dashed',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    placeholderText: {
        color: '#FFB74D',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
