import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator, ImageBackground, Platform, StatusBar } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { webRTCService } from '../../services/webRTCService';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { PhoneOff, Mic, MicOff, Camera, Video, VideoOff, Phone, User } from 'lucide-react-native';
import InCallManager from 'react-native-incall-manager';
import { useSettings } from '../../context/SettingsContext';
import { BlurView } from '@react-native-community/blur';

const { width, height } = Dimensions.get('window');

export const CallScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { vTheme, isDarkMode, portalBackground, portalBackgroundType } = useSettings();
    // @ts-ignore
    const { targetId, isIncoming, callerName } = route.params || {};

    const [hasAccepted, setHasAccepted] = useState(!isIncoming); // If outgoing, auto-accepted. If incoming, wait.
    const [streamVersion, setStreamVersion] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<string>(isIncoming ? 'Входящий звонок...' : 'Вызов...');
    const [iceState, setIceState] = useState<string>('new');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    // Initial setup - only start camera preview, don't connect yet if incoming
    useEffect(() => {
        let mounted = true;
        const startPreview = async () => {
            try {
                let stream = webRTCService.localStream;
                if (!stream) {
                    stream = await webRTCService.startLocalStream(true);
                }
                if (mounted) {
                    setLocalStream(stream);
                    const tracks = stream.getTracks().map(t => t.kind[0].toUpperCase()).join('/');
                    console.log(`Local stream ready: ${tracks}`);
                }
            } catch (e) {
                console.error("Camera preview failed", e);
            }
        };
        startPreview();
        return () => { mounted = false; };
    }, []);

    // Connection logic - only runs when call is accepted/outgoing
    useEffect(() => {
        if (!hasAccepted) return;

        let mounted = true;

        const connect = async () => {
            try {
                // ENSURE local stream is ready BEFORE starting call
                let currentLocalStream = webRTCService.localStream;
                if (!currentLocalStream) {
                    console.log('Local stream not ready, starting now...');
                    currentLocalStream = await webRTCService.startLocalStream(true);
                    if (mounted) setLocalStream(currentLocalStream);
                }

                // Setup Callbacks
                webRTCService.setOnRemoteStream((rStream) => {
                    const tracks = rStream.getTracks();
                    console.warn(`[UI] Received remote stream: ${rStream.id}, url: ${rStream.toURL().substring(0, 30)}... Tracks: ${tracks.length}`);
                    if (mounted) {
                        setRemoteStream(rStream);
                        setStreamVersion(v => v + 1);
                        // Show track types in status for debug
                        const trackInfo = tracks.map(t => t.kind[0].toUpperCase()).join('/');
                        setStatus(`Connected (${trackInfo})`);
                    }
                });

                webRTCService.setOnIceStateChange((state) => {
                    if (mounted) setIceState(state);
                });

                // Keep screen on
                InCallManager.setKeepScreenOn(true);

                if (!isIncoming && targetId) {
                    // OUTGOING: Start call
                    setStatus('Calling...');
                    await webRTCService.startCall(targetId);
                }
                // Note: Incoming call logic is now handled in handleAnswer via acceptCall()

            } catch (err) {
                console.error("Failed to start/setup call", err);
                if (mounted) setStatus('Failed');
            }
        };

        connect();

        return () => {
            mounted = false;
        };
    }, [hasAccepted, targetId, isIncoming]);


    // Cleanup on unmount (end call)
    useEffect(() => {
        return () => {
            // Only end call logic if we leave screen
            // But we might want to keep call in background? For now, kill it.
            webRTCService.endCall();
        };
    }, []);


    const handleAnswer = async () => {
        // Ensure local stream is ready before accepting
        let stream = webRTCService.localStream;
        if (!stream) {
            stream = await webRTCService.startLocalStream(true);
            setLocalStream(stream);
        }

        setHasAccepted(true);
        setStatus('Connecting...');
        await webRTCService.acceptCall();
    };

    const handleHangup = () => {
        webRTCService.sendHangup();
        navigation.goBack();
    };

    const toggleMute = () => {
        const stream = webRTCService.localStream;
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        const stream = webRTCService.localStream;
        if (stream) {
            stream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    const switchCamera = () => {
        const stream = webRTCService.localStream;
        if (stream) {
            stream.getVideoTracks().forEach(track => {
                // @ts-ignore
                if (track._switchCamera) track._switchCamera();
            });
        }
    };

    const Background = () => {
        if (hasAccepted && remoteStream) {
            // If remote stream is active, the video is the background.
            // We can return null or a dark overlay if needed.
            return <View style={styles.backgroundOverlay} />;
        }

        if (portalBackgroundType === 'image' && portalBackground) {
            return (
                <ImageBackground
                    source={{ uri: portalBackground }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                >
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="dark"
                        blurAmount={20}
                        reducedTransparencyFallbackColor="black"
                    />
                    <View style={styles.backgroundOverlay} />
                </ImageBackground>
            );
        }

        return (
            <LinearGradient
                colors={[vTheme.colors.background, '#000000']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
        );
    };

    // --- RENDER INCOMING CALL SCREEN ---
    if (isIncoming && !hasAccepted) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <Background />

                <View style={styles.callerContainer}>
                    <View style={styles.avatarLarge}>
                        <User size={60} color="#fff" />
                    </View>
                    <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
                    <Text style={styles.statusText}>{status}</Text>
                </View>

                <View style={[styles.incomingControls, { bottom: 80 }]}>
                    <TouchableOpacity onPress={handleHangup} style={[styles.actionBtn, styles.declineBtn]}>
                        <PhoneOff color="white" size={32} />
                        <Text style={styles.btnLabel}>Отклонить</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleAnswer} style={[styles.actionBtn, styles.acceptBtn]}>
                        <Phone color="white" size={32} />
                        <Text style={styles.btnLabel}>Принять</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- RENDER ACTIVE CALL SCREEN ---
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <Background />

            {remoteStream ? (
                <RTCView
                    key={`remote-${remoteStream.id}-${streamVersion}`}
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                    zOrder={0}
                    mirror={false}
                />
            ) : (
                <View style={styles.remotePlaceholder}>
                    <View style={styles.avatarLarge}>
                        <User size={60} color="#fff" />
                    </View>
                    <Text style={styles.callerName}>{callerName || 'User ' + targetId}</Text>
                    <Text style={styles.statusText}>{status}</Text>
                    {/* <Text style={styles.debugText}>ICE: {iceState}</Text> */}
                    <ActivityIndicator size="large" color={vTheme.colors.primary} style={{ marginTop: 20 }} />
                </View>
            )}

            {localStream && (
                <View style={styles.localVideoContainer}>
                    <RTCView
                        key={localStream.toURL()}
                        streamURL={localStream.toURL()}
                        style={styles.localVideo}
                        objectFit="cover"
                        zOrder={1}
                        mirror={true}
                    />
                </View>
            )}

            <View style={styles.controlsWrapper}>
                <View style={styles.controlsInner}>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="light"
                        blurAmount={20}
                        reducedTransparencyFallbackColor="rgba(0,0,0,0.5)"
                    />
                    <View style={styles.controlsContent}>
                        <TouchableOpacity onPress={toggleMute} style={[styles.controlBtn, isMuted && styles.controlBtnActive]}>
                            {isMuted ? <MicOff color={isMuted ? "white" : "#333"} size={22} /> : <Mic color="#333" size={22} />}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleVideo} style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnActive]}>
                            {!isVideoEnabled ? <VideoOff color={!isVideoEnabled ? "white" : "#333"} size={22} /> : <Video color="#333" size={22} />}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={switchCamera} style={styles.controlBtn}>
                            <Camera color="#333" size={22} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleHangup} style={[styles.controlBtn, styles.hangupBtn]}>
                            <PhoneOff color="white" size={28} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    remoteVideo: {
        width: width,
        height: height,
        backgroundColor: 'black',
    },
    remotePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    callerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    statusText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        marginTop: 8,
        fontFamily: 'Nunito',
    },
    callerName: {
        color: '#fff',
        fontSize: 34, // Slightly larger
        fontWeight: 'bold',
        marginTop: 20,
        fontFamily: 'Cinzel-Bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    avatarLarge: {
        width: 140, // Larger avatar
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        // Shadow for depth
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    localVideoContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 110, // Slightly wider
        height: 160,
        borderRadius: 20, // Softer corners
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)', // Glassy border
        elevation: 10,
        backgroundColor: '#000',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.35,
        shadowRadius: 6.27,
    },
    localVideo: {
        flex: 1,
        opacity: 0.9, // Slight transparency might look cool, but usually we want clear video. Let's keep it opaque but maybe add filter later.
    },

    // Controls styling
    controlsWrapper: {
        position: 'absolute',
        bottom: 50, // Moved up slightly
        left: 20,
        right: 20,
        height: 85, // Slightly taller
        borderRadius: 45,
        // No overflow hidden here, so shadow works
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.4, // Darker shadow
                shadowRadius: 20,
            },
            android: {
                elevation: 15,
            }
        })
    },
    controlsInner: {
        flex: 1,
        borderRadius: 45,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)', // Glass edge
    },
    controlsContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)', // Subtle tint
    },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlBtnActive: {
        backgroundColor: '#FF453A', // System Red for active/muted states
    },
    hangupBtn: {
        backgroundColor: '#FF3B30',
        width: 56,
        height: 56,
        borderRadius: 28,
        transform: [{ scale: 1.1 }]
    },

    // Incoming call controls
    incomingControls: {
        position: 'absolute',
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'flex-end',
        paddingHorizontal: 30,
    },
    actionBtn: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#34C759', // Green
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#34C759',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
            }
        })
    },
    declineBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FF3B30', // Red
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#FF3B30',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
            }
        })
    },
    btnLabel: {
        color: '#fff',
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        position: 'absolute',
        bottom: -24,
        width: 100,
        textAlign: 'center'
    },
    debugText: {
        color: '#ffeb3b',
        fontSize: 12,
        marginTop: 5,
    }
});
