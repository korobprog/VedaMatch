import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet, Alert, View } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Camera } from 'lucide-react-native';

interface AvatarUploaderProps {
    avatar: any;
    onAvatarChange: (asset: any) => void;
    theme: any;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({ avatar, onAvatarChange, theme }) => {
    const handleChooseAvatar = () => {
        Alert.alert(
            'Upload Photo',
            'Choose source',
            [
                {
                    text: 'Camera',
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
                        <Text style={styles.placeholderText}>Add Photo</Text>
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
