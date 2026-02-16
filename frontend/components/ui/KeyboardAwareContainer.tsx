import React from 'react';
import {
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAwareContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  behavior?: KeyboardAvoidingViewProps['behavior'];
  extraOffset?: number;
  useTopInset?: boolean;
  enabled?: boolean;
}

export const KeyboardAwareContainer: React.FC<KeyboardAwareContainerProps> = ({
  children,
  style,
  behavior,
  extraOffset = 0,
  useTopInset = true,
  enabled = true,
}) => {
  const insets = useSafeAreaInsets();
  const resolvedBehavior = behavior ?? (Platform.OS === 'ios' ? 'padding' : undefined);
  const keyboardVerticalOffset =
    Platform.OS === 'ios' ? (useTopInset ? insets.top : 0) + extraOffset : 0;

  return (
    <KeyboardAvoidingView
      style={style}
      enabled={enabled}
      behavior={resolvedBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
};
