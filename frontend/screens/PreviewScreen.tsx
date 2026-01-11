import React, { useRef } from 'react';
import { StyleSheet, View, StatusBar, TouchableOpacity } from 'react-native';
import Video, { VideoRef } from 'react-native-video';

interface PreviewScreenProps {
    onFinish: () => void;
}

const PreviewScreen: React.FC<PreviewScreenProps> = ({ onFinish }) => {
    const videoRef = useRef<VideoRef>(null);

    const onVideoEnd = () => {
        onFinish();
    };

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <TouchableOpacity
                activeOpacity={1}
                style={styles.container}
                onPress={onFinish}
            >
                <Video
                    source={require('../assets/video/prevy.mp4')}
                    ref={videoRef}
                    onEnd={onVideoEnd}
                    onError={(e) => {
                        console.error('Video error:', e);
                        onFinish();
                    }}
                    resizeMode="contain"
                    style={styles.backgroundVideo}
                    muted={false}
                    repeat={false}
                    playInBackground={false}
                    playWhenInactive={false}
                    ignoreSilentSwitch="ignore"
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
});

export default PreviewScreen;
