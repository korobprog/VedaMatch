import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Linking,
    Alert,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { CameraOff, X, Zap, ZapOff, Search } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { QRCodeScanResult } from '../../../types/cafe';
import { useCart } from '../../../contexts/CafeCartContext';
import { useCameraDevice, useCodeScanner, Camera } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

// Note: This screen requires react-native-vision-camera or similar library
// For now, we implement the logic and UI, camera integration can be added later

interface QRScannerScreenProps {
    onScanSuccess?: (result: QRCodeScanResult) => void;
}

const QRScannerScreen: React.FC<QRScannerScreenProps> = ({ onScanSuccess }) => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [isActive, setIsActive] = useState(true);

    const device = useCameraDevice('back');
    const { setTableInfo, cart: currentCart } = useCart();

    useEffect(() => {
        const checkPermissions = async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
        };
        checkPermissions();
    }, []);

    // Stop camera when screen loses focus
    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => {
            setIsActive(true);
        });
        const unsubscribeBlur = navigation.addListener('blur', () => {
            setIsActive(false);
        });

        return () => {
            unsubscribeFocus();
            unsubscribeBlur();
        };
    }, [navigation]);

    const handleBarCodeScanned = useCallback(async (qrCode: string) => {
        if (scanned || loading) return;

        console.log("Scanned QR:", qrCode);
        setScanned(true);
        setLoading(true);

        try {
            let qrCodeId = qrCode;
            if (qrCode.includes('cafe/table/')) {
                const parts = qrCode.split('cafe/table/');
                qrCodeId = parts[parts.length - 1].split('?')[0];
            }

            const result = await cafeService.scanQRCode(qrCodeId);

            const finishScan = (scanResult: QRCodeScanResult) => {
                if (onScanSuccess) {
                    onScanSuccess(scanResult);
                    return;
                }

                if (currentCart && currentCart.cafeId === scanResult.cafeId) {
                    setTableInfo(scanResult.tableId, scanResult.tableNumber);
                    navigation.goBack();
                    return;
                }

                navigation.replace('CafeDetail', {
                    cafeId: scanResult.cafeId,
                    tableId: scanResult.tableId,
                    tableNumber: scanResult.tableNumber,
                });
            };

            if (result.table?.upcomingReservation) {
                const startTime = new Date(result.table.upcomingReservation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                Alert.alert(
                    t('cafe.qr.tableReservedTitle'),
                    t('cafe.qr.tableReservedMessage', { time: startTime }),
                    [
                        {
                            text: t('common.ok'),
                            onPress: () => finishScan(result)
                        }
                    ]
                );
            } else {
                finishScan(result);
            }
        } catch (error: any) {
            console.error('Error scanning QR code:', error);
            Alert.alert(
                t('cafe.qr.scanError'),
                error.response?.data?.error || t('cafe.qr.invalidQR'),
                [
                    { text: t('cafe.qr.repeat'), onPress: () => { setScanned(false); setLoading(false); } },
                    { text: t('cafe.qr.close'), onPress: () => navigation.goBack() },
                ]
            );
        }
    }, [scanned, loading, navigation, onScanSuccess, currentCart, setTableInfo, t]);

    const lastScanRef = React.useRef<number>(0);

    const onCodeScannedJS = (value: string) => {
        const now = Date.now();
        if (now - lastScanRef.current < 1500) {
            return;
        }
        lastScanRef.current = now;
        handleBarCodeScanned(value);
    };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13'],
        onCodeScanned: (codes) => {
            'worklet';
            if (codes.length > 0 && codes[0]?.value) {
                const value = codes[0].value;
                runOnJS(onCodeScannedJS)(value);
            }
        }
    });

    const handleManualEntry = () => {
        navigation.navigate('CafeList');
    };

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <CameraOff size={64} color="#FF3B30" />
                <Text style={styles.statusText}>{t('cafe.qr.noAccess')}</Text>
                <Text style={styles.statusSubtext}>
                    {t('cafe.qr.noAccessDesc')}
                </Text>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => Linking.openSettings()}
                >
                    <Text style={styles.settingsButtonText}>{t('cafe.qr.openSettings')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.manualButton}
                    onPress={handleManualEntry}
                >
                    <Text style={styles.manualButtonText}>{t('cafe.qr.chooseManually')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (device == null) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.statusText}>Checking camera...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.cameraContainer}>
                <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={isActive && !scanned}
                    codeScanner={codeScanner}
                    torch={flashOn ? 'on' : 'off'}
                    photo={false}
                    video={false}
                    audio={false}
                />
            </View>

            {/* Scan overlay */}
            <View style={styles.overlay}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <X size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('cafe.qr.title')}</Text>
                    <TouchableOpacity
                        style={styles.flashButton}
                        onPress={() => setFlashOn(!flashOn)}
                    >
                        {flashOn ? (
                            <Zap size={24} color="#FFFFFF" />
                        ) : (
                            <ZapOff size={24} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Scan area */}
                <View style={styles.scanAreaContainer}>
                    <View style={styles.scanArea}>
                        {/* Corner decorations */}
                        <View style={[styles.corner, styles.cornerTopLeft]} />
                        <View style={[styles.corner, styles.cornerTopRight]} />
                        <View style={[styles.corner, styles.cornerBottomLeft]} />
                        <View style={[styles.corner, styles.cornerBottomRight]} />

                        {loading && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#FF6B00" />
                                <Text style={styles.loadingText}>{t('cafe.qr.processing')}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Instructions */}
                <View style={styles.instructions}>
                    <Text style={styles.instructionText}>
                        {t('cafe.qr.instruction')}
                    </Text>
                    <Text style={styles.instructionSubtext}>
                        {t('cafe.qr.instructionDesc')}
                    </Text>
                </View>

                {/* Bottom buttons */}
                <View style={styles.bottomButtons}>
                    <TouchableOpacity
                        style={styles.manualEntryButton}
                        onPress={handleManualEntry}
                    >
                        <Search size={20} color="#FFFFFF" />
                        <Text style={styles.manualEntryText}>{t('cafe.qr.findCafe')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    mockCamera: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
    },
    mockCameraText: {
        color: '#8E8E93',
        fontSize: 16,
        marginTop: 16,
    },
    mockScanButton: {
        marginTop: 32,
        backgroundColor: '#FF6B00',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    mockScanButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    flashButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanAreaContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanArea: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#FF6B00',
    },
    cornerTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 12,
    },
    cornerTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    cornerBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    cornerBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    loadingText: {
        color: '#FFFFFF',
        marginTop: 12,
        fontSize: 14,
    },
    instructions: {
        paddingHorizontal: 32,
        paddingVertical: 24,
        alignItems: 'center',
    },
    instructionText: {
        color: '#FFFFFF',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8,
    },
    instructionSubtext: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
    },
    bottomButtons: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    manualEntryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 14,
        borderRadius: 12,
    },
    manualEntryText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    statusSubtext: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },
    settingsButton: {
        marginTop: 24,
        backgroundColor: '#FF6B00',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    settingsButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    manualButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    manualButtonText: {
        color: '#8E8E93',
        fontSize: 14,
    },
});

export default QRScannerScreen;
