/**
 * Express Profile - Review Screen
 * 
 * Displays the recorded video and AI-generated profile suggestions.
 * Allows user to edit and confirm their profile data.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { useInterview } from '../../../hooks/useApi';
import { InterviewApi } from '../../../services/api';

interface AIData {
  bio: string;
  jobTitle: string;
  smokerFriendly: boolean;
  petFriendly: boolean;
  videoUrl: string;
  videoFilename: string;
}

export default function ReviewInterviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ videoUri: string; aiData: string }>();
  const { confirmProfile, isLoading, error } = useInterview();

  // Parse AI data from params
  const [aiData, setAiData] = useState<AIData | null>(null);
  
  // Form state
  const [bio, setBio] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [smokerFriendly, setSmokerFriendly] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);
  const [isVideoPublic, setIsVideoPublic] = useState(true);

  // Parse AI data on mount
  useEffect(() => {
    if (params.aiData) {
      try {
        const parsed = JSON.parse(params.aiData) as AIData;
        setAiData(parsed);
        
        // Pre-fill form with AI suggestions
        setBio(parsed.bio || '');
        setJobTitle(parsed.jobTitle || '');
        setSmokerFriendly(parsed.smokerFriendly || false);
        setPetFriendly(parsed.petFriendly || false);
      } catch (err) {
        console.error('Failed to parse AI data:', err);
      }
    }
  }, [params.aiData]);

  const handleConfirm = async () => {
    if (!aiData) {
      Alert.alert('Error', 'Missing video data');
      return;
    }

    if (!bio.trim()) {
      Alert.alert('Validation Error', 'Please provide a bio');
      return;
    }

    const result = await confirmProfile({
      bio: bio.trim(),
      jobTitle: jobTitle.trim() || 'Not specified',
      smokerFriendly,
      petFriendly,
      videoFilename: aiData.videoFilename,
      isVideoPublic,
    });

    if (result) {
      Alert.alert(
        '✅ Profile Complete!',
        'Your video intro has been saved and your profile is now verified.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(normal)/profile'),
          },
        ]
      );
    } else if (error) {
      Alert.alert('Error', error);
    }
  };

  // Get video URL for playback
  const getPlayableVideoUrl = () => {
    if (params.videoUri) {
      // Local recording URI (for preview)
      if (params.videoUri.startsWith('blob:') || 
          params.videoUri.startsWith('file://')) {
        return params.videoUri;
      }
    }
    // Server URL
    if (aiData?.videoUrl) {
      return InterviewApi.getVideoUrl(aiData.videoUrl);
    }
    return '';
  };

  if (!params.videoUri || !params.aiData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Missing video or profile data</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Your Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          {Platform.OS === 'web' ? (
            <video
              src={getPlayableVideoUrl()}
              style={styles.webVideo as any}
              controls
              playsInline
            />
          ) : (
            <Video
              source={{ uri: getPlayableVideoUrl() }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
            />
          )}
        </View>

        {/* AI Analysis Badge */}
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>✨ AI-Generated Profile</Text>
          <Text style={styles.aiBadgeSubtext}>
            Review and edit the suggestions below
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell landlords about yourself..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Job Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Title / Occupation</Text>
            <TextInput
              style={styles.input}
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="e.g. Software Engineer"
              placeholderTextColor="#666"
            />
          </View>

          {/* Toggles */}
          <View style={styles.togglesContainer}>
            <Text style={styles.sectionTitle}>Lifestyle Preferences</Text>
            
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>🚬 Smoker-Friendly</Text>
                <Text style={styles.toggleHint}>
                  Are you okay with smoking?
                </Text>
              </View>
              <Switch
                value={smokerFriendly}
                onValueChange={setSmokerFriendly}
                trackColor={{ false: '#333', true: '#6366f1' }}
                thumbColor={smokerFriendly ? '#fff' : '#888'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>🐾 Pet-Friendly</Text>
                <Text style={styles.toggleHint}>
                  Do you have or like pets?
                </Text>
              </View>
              <Switch
                value={petFriendly}
                onValueChange={setPetFriendly}
                trackColor={{ false: '#333', true: '#6366f1' }}
                thumbColor={petFriendly ? '#fff' : '#888'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>🎥 Public Video</Text>
                <Text style={styles.toggleHint}>
                  Allow landlords to view your video
                </Text>
              </View>
              <Switch
                value={isVideoPublic}
                onValueChange={setIsVideoPublic}
                trackColor={{ false: '#333', true: '#22c55e' }}
                thumbColor={isVideoPublic ? '#fff' : '#888'}
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>✓ Complete Profile</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.submitHint}>
            Only verified profiles are visible to landlords
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
  },
  backText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  videoContainer: {
    marginHorizontal: 20,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#000',
  },
  aiBadge: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  aiBadgeText: {
    color: '#818cf8',
    fontSize: 16,
    fontWeight: '600',
  },
  aiBadgeSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginTop: 4,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    backgroundColor: '#222',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 100,
  },
  togglesContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  submitContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  submitHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 40,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
