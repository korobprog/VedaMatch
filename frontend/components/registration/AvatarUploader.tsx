import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet, Alert, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

interface AvatarUploaderProps {
    avatar: any;
    onAvatarChange: (asset: any) => void;
    theme: any;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({ avatar, onAvatarChange, theme }) => {
    const handleChooseAvatar = () => {
        Alert.alert(
            'Upload Avatar',
            'Choose an option',
            [
                {
                    text: 'Camera (Front)',
                    onPress: () => {
                        launchCamera({ mediaType: 'photo', cameraType: 'front', saveToPhotos: true }, (response) => {
                            if (response.assets && response.assets.length > 0) {
                                onAvatarChange(response.assets[0]);
                            }
                        });
                    },
                },
                {
                    text: 'Gallery',
                    onPress: () => {
                        launchImageLibrary({ mediaType: 'photo' }, (response) => {
                            if (response.assets && response.assets.length > 0) {
                                onAvatarChange(response.assets[0]);
                            }
                        });
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    return (
        <TouchableOpacity
            onPress={handleChooseAvatar}
            style={[styles.avatarContainer, { borderColor: theme.accent }]}
        >
            {avatar ? (
                <Image source={{ uri: avatar.uri }} style={styles.avatarImage} />
            ) : (
                <Text style={{ color: theme.subText }}>Add Photo</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        overflow: 'hidden',
        borderStyle: 'dashed',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
});
