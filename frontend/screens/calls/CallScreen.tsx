import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { sipService } from '../../services/sipService';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { PhoneOff, Mic, MicOff, Camera, Video, VideoOff } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export const CallScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    // @ts-ignore
    const { targetId, isIncoming, callerName } = route.params || {};

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<string>(isIncoming ? 'Incoming Call...' : 'Calling...');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                // Use the stream initialized in SipService
                if (sipService.localStream) {
                    setLocalStream(sipService.localStream);
                } else {
                    // Try to init if not ready? Usually App handles init.
                    // Or retrieve it again? 
                    // For now assume initialized
                }

                // Remote stream handling for SIP with SimpleUser is complex for Video.
                // Audio is auto-played.
                setStatus('Connected');

                if (!isIncoming && targetId) {
                    await sipService.call(`sip:${targetId}@your-domain`);
                } else if (isIncoming) {
                    await sipService.answer();
                }
            } catch (err) {
                console.error("Failed to start call", err);
                setStatus('Failed');
            }
        };
        init();

        return () => {
            // Do NOT clean up local stream globally if it's shared, but sipService manages it.
            // sipService.hangup() handles session termination.
        };
    }, []);

    const handleHangup = async () => {
        await sipService.hangup();
        navigation.goBack();
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    const switchCamera = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                // @ts-ignore
                track._switchCamera();
            });
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.gradient} />

            {remoteStream ? (
                <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
            ) : (
                <View style={styles.remotePlaceholder}>
                    <Text style={styles.statusText}>{status}</Text>
                    <Text style={styles.callerName}>{callerName || 'Unknown'}</Text>
                    <ActivityIndicator size="large" color="#e94560" style={{ marginTop: 20 }} />
                </View>
            )}

            {localStream && (
                <View style={styles.localVideoContainer}>
                    <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" zOrder={1} />
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
});
