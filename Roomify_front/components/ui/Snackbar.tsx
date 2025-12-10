/**
 * Snackbar Component
 * Toast notification for mobile using Paper Snackbar
 */

import React from 'react';
import { Snackbar as PaperSnackbar } from 'react-native-paper';
import { Blue } from '../../constants/theme';

interface SnackbarProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export function Snackbar({
  visible,
  message,
  onDismiss,
  action,
  duration = 3000,
  type = 'info',
}: SnackbarProps) {
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#10B981';
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      default:
        return Blue[600];
    }
  };

  return (
    <PaperSnackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={duration}
      action={action}
      style={{ backgroundColor: getBackgroundColor() }}
      theme={{ colors: { surface: '#FFFFFF', onSurface: '#000000' } }}
    >
      {message}
    </PaperSnackbar>
  );
}

export default Snackbar;
