import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface PreviewScreenProps {
    onFinish: () => void;
}

const PreviewScreen: React.FC<PreviewScreenProps> = ({ onFinish }) => {
    const pulse = useRef(new Animated.Value(0)).current;
    const finishedRef = useRef(false);

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0,
                    duration: 900,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );
        animation.start();

        const timer = setTimeout(() => {
            if (!finishedRef.current) {
                finishedRef.current = true;
                onFinish();
            }
        }, 1400);

        return () => {
            animation.stop();
            clearTimeout(timer);
        };
    }, [onFinish, pulse]);

    const handleFinish = () => {
        if (!finishedRef.current) {
            finishedRef.current = true;
            onFinish();
        }
    };

    const logoScale = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.04],
    });
    const logoOpacity = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.88, 1],
    });

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <TouchableOpacity
                activeOpacity={1}
                style={styles.container}
                onPress={handleFinish}
            >
                <View style={styles.content}>
                    <Animated.View
                        style={[
                            styles.logoWrap,
                            {
                                transform: [{ scale: logoScale }],
                                opacity: logoOpacity,
                            },
                        ]}
                    >
                        <Image
                            source={require('../assets/logo_vedic.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </Animated.View>
                    <ActivityIndicator size="small" color="#F59E0B" style={styles.loader} />
                    <Text style={styles.caption}>VedaMatch</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#070D1A',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    logoWrap: {
        width: 148,
        height: 148,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 108,
        height: 108,
    },
    loader: {
        marginTop: 18,
    },
    caption: {
        marginTop: 10,
        color: 'rgba(255,255,255,0.92)',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});

export default PreviewScreen;
