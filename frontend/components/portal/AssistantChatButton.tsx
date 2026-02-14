import React, { useEffect, useMemo, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Image, Animated, StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import { RootStackParamList } from '../../types/navigation';
import peacockAssistant from '../../assets/peacockAssistant.png';
import krishnaAssistant from '../../assets/krishnaAssistant.png';
import nanoBanano from '../../assets/nano_banano.png';

interface AssistantChatButtonProps {
    size?: number;
    style?: StyleProp<ViewStyle>;
}

export const AssistantChatButton: React.FC<AssistantChatButtonProps> = ({ size = 40, style }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { handleNewChat } = useChat();
    const { assistantType } = useSettings();
    const shimmerAnim = useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 60,
                duration: 2500,
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => {
            loop.stop();
            shimmerAnim.stopAnimation();
        };
    }, [shimmerAnim]);

    const assistantImage = useMemo(() => {
        if (assistantType === 'feather2') {
            return nanoBanano;
        }
        if (assistantType === 'feather') {
            return peacockAssistant;
        }
        return krishnaAssistant;
    }, [assistantType]);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
                handleNewChat();
                navigation.navigate('Chat');
            }}
            style={[styles.button, { width: size, height: size, borderRadius: size / 2 }, style]}
            accessibilityRole="button"
            accessibilityLabel="Открыть ассистента"
        >
            <LinearGradient
                colors={[
                    'rgba(255,255,255,0.4)',
                    'rgba(255,230,150,0.3)',
                    'rgba(255,255,255,0.4)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <Animated.View
                style={[
                    styles.shimmer,
                    {
                        width: size * 1.2,
                        transform: [{
                            translateX: shimmerAnim.interpolate({
                                inputRange: [-60, 60],
                                outputRange: [-size * 1.8, size * 1.8],
                            }),
                        }],
                    },
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            <Image
                source={assistantImage}
                style={[styles.icon, { width: size * 0.62, height: size * 0.62 }]}
                resizeMode="contain"
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.6)',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
    },
    icon: {
        zIndex: 1,
    },
});
