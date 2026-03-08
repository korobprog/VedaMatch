import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  color: string;
  style?: StyleProp<ViewStyle>;
};

export const DhamaSkeletonBlock: React.FC<Props> = ({ color, style }) => (
  <View style={[styles.base, { backgroundColor: color }, style]} />
);

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
