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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraOff, X, Zap, ZapOff, Search, QrCode } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { QRCodeScanResult } from '../../../types/cafe';
import { useCart } from '../../../contexts/CafeCartContext';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { useCameraDevice, useCodeScanner, Camera } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.75;

interface QRScannerScreenProps {
    onScanSuccess?: (result: QRCodeScanResult) => void;
}

const QRScannerScreen: React.FC<QRScannerScreenProps> = ({ onScanSuccess }) => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [isActive, setIsActive] = useState(true);

    const device = useCameraDevice('back');
    const { setTableInfo, cart: currentCart } = useCart();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        const checkPermissions = async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
        };
        checkPermissions();
    }, []);

    useEffect(() => {
        const unsubscribeFocus = navigation.addListener('focus', () => setIsActive(true));
        const unsubscribeBlur = navigation.addListener('blur', () => setIsActive(false));
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
                    [{ text: t('common.ok'), onPress: () => finishScan(result) }]
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
        if (now - lastScanRef.current < 1500) return;
        lastScanRef.current = now;
        handleBarCodeScanned(value);
    };

    const codeScanner = useCodeScanner({
        codeTypes: ['qr', 'ean-13'],
        onCodeScanned: (codes) => {
            'worklet';
            if (codes.length > 0 && codes[0]?.value) {
                runOnJS(onCodeScannedJS)(codes[0].value);
            }
        }
    });

    const handleManualEntry = () => navigation.navigate('CafeList');

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={roleTheme.gradient} style={StyleSheet.absoluteFill} />
                <View style={styles.permissionBox}>
                    <View style={styles.iconCircle}>
                        <CameraOff size={40} color={colors.danger} />
                    </View>
                    <Text style={styles.statusText}>{t('cafe.qr.noAccess')}</Text>
                    <Text style={styles.statusSubtext}>{t('cafe.qr.noAccessDesc')}</Text>

                    <TouchableOpacity style={styles.primaryBtn} onPress={() => Linking.openSettings()}>
                        <LinearGradient colors={[colors.accent, colors.warning]} style={styles.btnGradient}>
                            <Text style={styles.btnText}>{t('cafe.qr.openSettings')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleManualEntry}>
                        <Text style={styles.secondaryBtnText}>{t('cafe.qr.chooseManually')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.cameraContainer}>
                {device && (
                    <Camera
                        style={StyleSheet.absoluteFill}
                        device={device}
                        isActive={isActive && !scanned}
                        codeScanner={codeScanner}
                        torch={flashOn ? 'on' : 'off'}
                    />
                )}
            </View>

            <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                        <X size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('cafe.qr.title')}</Text>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setFlashOn(!flashOn)}>
                        {flashOn ? <Zap size={22} color={colors.accent} /> : <ZapOff size={22} color={colors.textPrimary} />}
                    </TouchableOpacity>
                </View>

                <View style={styles.scanWrapper}>
                    <View style={styles.scanFrame}>
                        {/* Cutouts logic - we use a hole in a dark overlay */}
                        <View style={styles.frameCornerTopLeft} />
                        <View style={styles.frameCornerTopRight} />
                        <View style={styles.frameCornerBottomLeft} />
                        <View style={styles.frameCornerBottomRight} />

                        {loading && (
                            <View style={styles.loaderGlass}>
                                <ActivityIndicator size="large" color={colors.accent} />
                                <Text style={styles.loaderText}>{t('cafe.qr.processing')}</Text>
                            </View>
                        )}

                        {!loading && !scanned && (
                            <View style={styles.scanAnimLine} />
                        )}
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.infoGlass}>
                        <QrCode size={20} color={colors.accent} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoHeadline}>{t('cafe.qr.instruction')}</Text>
                            <Text style={styles.infoBody}>{t('cafe.qr.instructionDesc')}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.manualBtn} onPress={handleManualEntry}>
                        <LinearGradient
                            colors={[colors.surfaceElevated, colors.surface]}
                            style={styles.manualBtnGradient}
                        >
                            <Search size={18} color={colors.textPrimary} />
                            <Text style={styles.manualBtnText}>{t('cafe.qr.findCafe')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    cameraContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    scanWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: SCAN_AREA_SIZE,
        height: SCAN_AREA_SIZE,
        position: 'relative',
    },
    frameCornerTopLeft: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: colors.accent,
        borderTopLeftRadius: 20,
    },
    frameCornerTopRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: colors.accent,
        borderTopRightRadius: 20,
    },
    frameCornerBottomLeft: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: colors.accent,
        borderBottomLeftRadius: 20,
    },
    frameCornerBottomRight: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: colors.accent,
        borderBottomRightRadius: 20,
    },
    scanAnimLine: {
        position: 'absolute',
        top: '50%',
        left: '10%',
        right: '10%',
        height: 2,
        backgroundColor: colors.accent,
        shadowColor: colors.accent,
        shadowRadius: 10,
        shadowOpacity: 0.8,
    },
    loaderGlass: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    loaderText: {
        color: colors.textPrimary,
        marginTop: 16,
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        padding: 24,
        gap: 20,
    },
    infoGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: colors.surfaceElevated,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoHeadline: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    infoBody: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    manualBtn: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    manualBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    manualBtnText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '700',
    },
    permissionBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accentSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    statusText: {
        color: colors.textPrimary,
        fontSize: 22,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    statusSubtext: {
        color: colors.textSecondary,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    primaryBtn: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    btnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    btnText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    secondaryBtn: {
        paddingVertical: 12,
    },
    secondaryBtnText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});

export default QRScannerScreen;
