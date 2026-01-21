/**
 * Express Profile - Video Intro Recording Screen
 * * Records video using:
 * - expo-camera on Mobile (iOS/Android)
 * - MediaRecorder API on Web
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useIsFocused, useFocusEffect } from '@react-navigation/native'; // Added useFocusEffect
import { useInterview } from '../../../hooks/useApi';

const MAX_DURATION = 60; // 60 seconds max

export default function RecordInterviewScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { analyzeVideo, isAnalyzing, error } = useInterview();

  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  // Refs
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Web-specific refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);

  // --- CHANGED: Handle Camera Lifecycle based on Focus ---
  useFocusEffect(
      useCallback(() => {
        // 1. When screen is FOCUSED
        const startCamera = async () => {
          // Only init web camera if we haven't recorded yet
          if (Platform.OS === 'web' && !recordedVideoUri) {
            await initWebCamera();
          }
        };

        startCamera();

        // 2. When screen is BLURRED (navigated away or closed)
        return () => {
          // Stop the timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          // KILL Web Camera Stream
          if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
            videoStreamRef.current = null;
          }

          // Reset recording state
          setIsRecording(false);
        };
      }, [recordedVideoUri]) // Re-run if we retake the video
  );

  // Request permissions on mount
  useEffect(() => {
    if (Platform.OS !== 'web') {
      requestCameraPermission();
      requestMicPermission();
    }
  }, []);

  const initWebCamera = async () => {
    try {
      // If we already have a stream, don't re-init
      if (videoStreamRef.current && videoStreamRef.current.active) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: true,
      });
      videoStreamRef.current = stream;

      // Attach to video element if available
      if (webVideoRef.current) {
        webVideoRef.current.srcObject = stream;
        webVideoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      console.error('Failed to access camera:', err);
      Alert.alert('Camera Error', 'Failed to access camera. Please grant permissions.');
    }
  };

  // Timer logic
  const startTimer = () => {
    setTimer(0);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev >= MAX_DURATION - 1) {
          stopRecording();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    if (Platform.OS === 'web') {
      startWebRecording();
    } else {
      startMobileRecording();
    }
  };

  const startMobileRecording = async () => {
    if (!cameraRef.current || !cameraReady) {
      Alert.alert('Error', 'Camera is not ready');
      return;
    }

    try {
      setIsRecording(true);
      startTimer();

      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION,
      });

      if (video?.uri) {
        setRecordedVideoUri(video.uri);
      }
    } catch (err) {
      console.error('Recording error:', err);
      setIsRecording(false);
      stopTimer();
    }
  };

  const startWebRecording = () => {
    if (!videoStreamRef.current) {
      Alert.alert('Error', 'Camera stream not available');
      return;
    }

    chunksRef.current = [];

    const mediaRecorder = new MediaRecorder(videoStreamRef.current, {
      mimeType: 'video/webm;codecs=vp9',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUri(url);
      setIsRecording(false);
      stopTimer();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Collect data every second
    setIsRecording(true);
    startTimer();
  };

  // Stop recording
  const stopRecording = async () => {
    stopTimer();

    if (Platform.OS === 'web') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } else {
      if (cameraRef.current) {
        cameraRef.current.stopRecording();
      }
      setIsRecording(false);
    }
  };

  // Retake video
  const retakeVideo = () => {
    if (recordedVideoUri && Platform.OS === 'web') {
      URL.revokeObjectURL(recordedVideoUri);
    }
    setRecordedVideoUri(null);
    setTimer(0);
    // Note: useFocusEffect will handle re-init because recordedVideoUri changed
  };

  // Analyze with AI
  const handleAnalyze = async () => {
    if (!recordedVideoUri) {
      Alert.alert('Error', 'No video recorded');
      return;
    }

    const result = await analyzeVideo(recordedVideoUri);

    if (result) {
      // Navigate to review screen with data
      router.push({
        pathname: '/(normal)/interview/review',
        params: {
          videoUri: recordedVideoUri,
          aiData: JSON.stringify(result),
        },
      });
    } else if (error) {
      Alert.alert('Analysis Failed', error);
    }
  };

  // Permission denied view
  if (Platform.OS !== 'web' && (!cameraPermission?.granted || !micPermission?.granted)) {
    return (
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionTitle}>Camera & Microphone Access Required</Text>
            <Text style={styles.permissionText}>
              We need camera and microphone access to record your video intro.
            </Text>
            <TouchableOpacity
                style={styles.permissionButton}
                onPress={() => {
                  requestCameraPermission();
                  requestMicPermission();
                }}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
    );
  }

  // Analyzing overlay
  if (isAnalyzing) {
    return (
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.analyzingText}>Creating your profile...</Text>
          <Text style={styles.analyzingSubtext}>
            Our AI is extracting your profile information
          </Text>
        </View>
    );
  }

  return (
      <View style={styles.container}>
        {/* Camera Preview */}
        <View style={styles.cameraContainer}>
          {Platform.OS === 'web' ? (
              // Web: Only render video element if focused
              isFocused && (
                  <video
                      ref={webVideoRef as any}
                      style={styles.webVideo as any}
                      autoPlay
                      muted
                      playsInline
                  />
              )
          ) : (
              // Mobile: Only render CameraView if focused
              isFocused && (
                  <CameraView
                      ref={cameraRef}
                      style={styles.camera}
                      facing="front"
                      mode="video"
                      onCameraReady={() => setCameraReady(true)}
                  />
              )
          )}

          {/* Timer Overlay */}
          <View style={styles.timerOverlay}>
            <View style={[
              styles.timerBadge,
              isRecording && styles.timerBadgeRecording
            ]}>
              {isRecording && <View style={styles.recordingDot} />}
              <Text style={styles.timerText}>
                {formatTime(timer)} / {formatTime(MAX_DURATION)}
              </Text>
            </View>
          </View>

          {/* Recorded video preview */}
          {recordedVideoUri && !isRecording && Platform.OS === 'web' && (
              <video
                  src={recordedVideoUri}
                  style={styles.webVideo as any}
                  controls
              />
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {!recordedVideoUri ? (
              // Recording controls
              <View style={styles.recordingControls}>
                {!isRecording ? (
                    <TouchableOpacity
                        style={styles.recordButton}
                        onPress={startRecording}
                        disabled={!cameraReady && Platform.OS !== 'web'}
                    >
                      <View style={styles.recordButtonInner} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.stopButton}
                        onPress={stopRecording}
                    >
                      <View style={styles.stopButtonInner} />
                    </TouchableOpacity>
                )}
                <Text style={styles.recordingHint}>
                  {isRecording ? 'Tap to stop' : 'Tap to record'}
                </Text>
              </View>
          ) : (
              // Review controls
              <View style={styles.reviewControls}>
                <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={retakeVideo}
                >
                  <Text style={styles.retakeButtonText}>↺ Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.analyzeButton}
                    onPress={handleAnalyze}
                >
                  <Text style={styles.analyzeButtonText}>✨ Auto-fill Profile</Text>
                </TouchableOpacity>
              </View>
          )}
        </View>

        {/* Back button */}
        <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Instructions */}
        {!isRecording && !recordedVideoUri && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Tips for a great intro:</Text>
              <Text style={styles.instructionItem}>• Introduce yourself briefly</Text>
              <Text style={styles.instructionItem}>• Mention your occupation</Text>
              <Text style={styles.instructionItem}>• Share your lifestyle preferences</Text>
            </View>
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  timerOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerBadgeRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsContainer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ef4444',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  stopButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  recordingHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 12,
    opacity: 0.7,
  },
  reviewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionItem: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#111',
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 40,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
  },
  analyzingSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});