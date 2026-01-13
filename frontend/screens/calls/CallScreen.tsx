import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { webRTCService } from '../../services/webRTCService';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { PhoneOff, Mic, MicOff, Camera, Video, VideoOff, Phone } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export const CallScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    // @ts-ignore
    const { targetId, isIncoming, callerName } = route.params || {};

    const [hasAccepted, setHasAccepted] = useState(!isIncoming); // If outgoing, auto-accepted. If incoming, wait.
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<string>(isIncoming ? 'Incoming Call...' : 'Calling...');
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
                if (mounted) setLocalStream(stream);
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
                    console.log('Got remote stream in UI!', rStream.toURL(), 'Tracks:', rStream.getTracks().length);
                    if (mounted) {
                        // Create a new stream object reference to force React re-render
                        // This ensures that when new tracks are added to the same stream, 
                        // the RTCView updates correctly.
                        setRemoteStream(new MediaStream(rStream));
                        setStatus('Connected');
                    }
                });

                webRTCService.setOnIceStateChange((state) => {
                    if (mounted) setIceState(state);
                });

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

    // --- RENDER INCOMING CALL SCREEN ---
    if (isIncoming && !hasAccepted) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#1a1a2e', '#000']} style={styles.gradient} />

                {/* Preview User's own face in background or blurred? Or just caller info */}
                {localStream && (
                    <RTCView
                        key={localStream.id}
                        streamURL={localStream.toURL()}
                        style={StyleSheet.absoluteFill}
                        objectFit="cover"
                        zOrder={0}
                        mirror={true}
                    />
                )}

                <View style={[styles.remotePlaceholder, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
                    <Text style={styles.statusText}>Incoming Video Call...</Text>
                </View>

                <View style={styles.incomingControls}>
                    <TouchableOpacity onPress={handleHangup} style={[styles.btn, styles.hangupBtnLarge]}>
                        <PhoneOff color="white" size={40} />
                    </TouchableOpacity>

                    <View style={{ width: 60 }} />

                    <TouchableOpacity onPress={handleAnswer} style={[styles.btn, styles.answerBtnLarge]}>
                        <Phone color="white" size={40} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- RENDER ACTIVE CALL SCREEN ---
    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.gradient} />

            {remoteStream ? (
                <RTCView
                    key={remoteStream.id}
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                />
            ) : (
                <View style={styles.remotePlaceholder}>
                    <Text style={styles.statusText}>{status}</Text>
                    <Text style={styles.debugText}>ICE: {iceState}</Text>
                    <Text style={styles.callerName}>{callerName || 'User ' + targetId}</Text>
                    <ActivityIndicator size="large" color="#e94560" style={{ marginTop: 20 }} />
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

            <View style={styles.controls}>
                <TouchableOpacity onPress={toggleMute} style={[styles.btn, isMuted && styles.btnActive]}>
                    {isMuted ? <MicOff color="white" size={24} /> : <Mic color="white" size={24} />}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleHangup} style={[styles.btn, styles.hangupBtn]}>
                    <PhoneOff color="white" size={32} />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleVideo} style={[styles.btn, !isVideoEnabled && styles.btnActive]}>
                    {!isVideoEnabled ? <VideoOff color="white" size={24} /> : <Video color="white" size={24} />}
                </TouchableOpacity>

                <TouchableOpacity onPress={switchCamera} style={styles.btn}>
                    <Camera color="white" size={24} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
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
    statusText: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 10,
    },
    callerName: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    localVideoContainer: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 100,
        height: 150,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 5,
    },
    localVideo: {
        flex: 1,
    },
    controls: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    incomingControls: {
        position: 'absolute',
        bottom: 100,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnActive: {
        backgroundColor: '#e94560',
    },
    hangupBtn: {
        backgroundColor: '#ff4d4d',
        width: 70,
        height: 70,
        borderRadius: 35,
    },
    hangupBtnLarge: {
        backgroundColor: '#ff4d4d',
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    answerBtnLarge: {
        backgroundColor: '#4cd137',
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    debugText: {
        color: '#ffeb3b',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
    }
});
