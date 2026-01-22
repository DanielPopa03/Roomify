/**
 * Interview Screens Layout
 * 
 * Provides a simple stack layout for the interview flow.
 */

import { Stack } from 'expo-router';

export default function InterviewLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#111' },
      }}
    >
      <Stack.Screen name="record" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
