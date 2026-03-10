import React, { useEffect } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

export const SplashScreen: React.FC = () => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    // Fade in
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    
    // Scale pulse (breathing effect)
    scale.value = withSequence(
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
      withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Infinite repeat
        false // Do not auto-reverse because we manually sequenced it back to 1
      )
    );
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Animated.Image
        source={require('../../assets/logo_vedamatch.png')}
        style={[styles.logo, animatedStyle]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F3EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 240,
  },
});
