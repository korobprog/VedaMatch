import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../context/UserContext';
import { COLORS } from '../chat/ChatConstants';
import { useColorScheme } from 'react-native';

interface ProtectedScreenProps {
	children: React.ReactNode;
	requireCompleteProfile?: boolean;
}

export const ProtectedScreen: React.FC<ProtectedScreenProps> = ({
	children,
	requireCompleteProfile = false
}) => {
	const navigation = useNavigation<any>();
	const { user, isLoggedIn, isLoading } = useUser();
	const isDarkMode = useColorScheme() === 'dark');
	const theme = isDarkMode ? COLORS.dark : COLORS.light;

	useEffect(() => {
		if (isLoading) return;

		// Redirect to login if not logged in
		if (!isLoggedIn || !user?.ID) {
			setTimeout(() => {
				navigation.replace('Login');
			}, 100);
			return;
		}

		// Redirect to registration if profile is incomplete and required
		if (requireCompleteProfile && !user.isProfileComplete) {
			setTimeout(() => {
				navigation.replace('Registration', { isDarkMode, phase: 'profile' });
			}, 100);
		}
	}, [isLoggedIn, user, isLoading, requireCompleteProfile]);

	// Loading state
	if (isLoading) {
		return (
			<View style={[styles.container, { backgroundColor: theme.background }]}>
				<ActivityIndicator size="large" color={theme.accent} />
			</View>
		);
	}

	// Not logged in
	if (!isLoggedIn || !user?.ID) {
		return (
			<View style={[styles.container, { backgroundColor: theme.background }]}>
				<View style={styles.messageContainer}>
					<Text style={[styles.title, { color: theme.text }]}>Login Required</Text>
					<Text style={[styles.subtitle, { color: theme.subText }]}>
						Please log in to access this feature
					</Text>
					<TouchableOpacity
						style={[styles.button, { backgroundColor: theme.accent }]}
						onPress={() => navigation.replace('Login')}
					>
						<Text style={styles.buttonText}>Go to Login</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	// Profile incomplete but required
	if (requireCompleteProfile && !user.isProfileComplete) {
		return (
			<View style={[styles.container, { backgroundColor: theme.background }]}>
				<View style={styles.messageContainer}>
					<Text style={[styles.title, { color: theme.text }]}>Complete Your Profile</Text>
					<Text style={[styles.subtitle, { color: theme.subText }]}>
						Please complete your profile to access this feature
					</Text>
					<TouchableOpacity
						style={[styles.button, { backgroundColor: theme.accent }]}
						onPress={() => navigation.replace('Registration', { isDarkMode, phase: 'profile' })}
					>
						<Text style={styles.buttonText}>Complete Profile</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	// All good - render children
	return <>{children}</>;
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	messageContainer: {
		alignItems: 'center',
		paddingHorizontal: 30,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 12,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 16,
		marginBottom: 24,
		textAlign: 'center',
		lineHeight: 22,
	},
	button: {
		paddingHorizontal: 40,
		paddingVertical: 14,
		borderRadius: 25,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
});
