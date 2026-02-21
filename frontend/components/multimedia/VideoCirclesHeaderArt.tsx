import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
import { useSettings } from '../../context/SettingsContext';

const { width } = Dimensions.get('window');
const HEIGHT = 320;

export const VideoCirclesHeaderArt = () => {
    const { isDarkMode } = useSettings();

    // Warm, fluid gradients based on the theme
    return (
        <View style={styles.container}>
            <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
                <Defs>
                    {isDarkMode ? (
                        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor="#1a0d00" stopOpacity="0.9" />
                            <Stop offset="1" stopColor="#150821" stopOpacity="0.95" />
                        </LinearGradient>
                    ) : (
                        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor="#fff1f2" stopOpacity="1" />
                            <Stop offset="1" stopColor="#fdf4ff" stopOpacity="1" />
                        </LinearGradient>
                    )}
                    
                    <RadialGradient id="glow1" cx="0.85" cy="0.15" r="0.7">
                        <Stop offset="0" stopColor="#EA580C" stopOpacity={isDarkMode ? "0.6" : "0.3"} />
                        <Stop offset="0.5" stopColor="#D946EF" stopOpacity={isDarkMode ? "0.2" : "0.1"} />
                        <Stop offset="1" stopColor="#000000" stopOpacity="0" />
                    </RadialGradient>
                    <RadialGradient id="glow2" cx="0.1" cy="0.9" r="0.8">
                        <Stop offset="0" stopColor="#9333EA" stopOpacity={isDarkMode ? "0.4" : "0.2"} />
                        <Stop offset="0.6" stopColor="#EA580C" stopOpacity={isDarkMode ? "0.1" : "0.05"} />
                        <Stop offset="1" stopColor="#000000" stopOpacity="0" />
                    </RadialGradient>
                    <LinearGradient id="wave1" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#EA580C" stopOpacity={isDarkMode ? "0.4" : "0.2"} />
                        <Stop offset="0.5" stopColor="#F43F5E" stopOpacity={isDarkMode ? "0.25" : "0.1"} />
                        <Stop offset="1" stopColor="#9333EA" stopOpacity="0" />
                    </LinearGradient>
                    <LinearGradient id="wave2" x1="0" y1="0.5" x2="1" y2="0">
                        <Stop offset="0" stopColor="#9333EA" stopOpacity={isDarkMode ? "0.3" : "0.15"} />
                        <Stop offset="0.5" stopColor="#D946EF" stopOpacity={isDarkMode ? "0.15" : "0.05"} />
                        <Stop offset="1" stopColor="#EA580C" stopOpacity="0" />
                    </LinearGradient>
                </Defs>

                {/* Base Background */}
                <Path d={`M0,0 h${width} v${HEIGHT} h-${width} Z`} fill="url(#bg)" />

                {/* Major Glows for depth */}
                <Path d={`M0,0 h${width} v${HEIGHT} h-${width} Z`} fill="url(#glow1)" />
                <Path d={`M0,0 h${width} v${HEIGHT} h-${width} Z`} fill="url(#glow2)" />

                {/* Fluid 3D-like overlapping waves */}
                <Path 
                    d={`M0,${HEIGHT * 0.4} C${width * 0.2},${HEIGHT * 0.6} ${width * 0.5},${HEIGHT * 0.3} ${width},${HEIGHT * 0.7} V${HEIGHT} H0 Z`} 
                    fill="url(#wave1)" 
                />
                <Path 
                    d={`M0,${HEIGHT * 0.55} C${width * 0.3},${HEIGHT * 0.75} ${width * 0.7},${HEIGHT * 0.5} ${width},${HEIGHT * 0.85} V${HEIGHT} H0 Z`} 
                    fill="url(#wave2)" 
                />
            </Svg>
            <View style={[styles.overlay, !isDarkMode && styles.overlayLight]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEIGHT,
        overflow: 'hidden',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    overlayLight: {
        backgroundColor: 'transparent',
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
});
