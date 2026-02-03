import { Platform } from 'react-native';
import { StripeProviderWrapper as WebWrapper } from './StripeProviderWrapper.web';
import { StripeProviderWrapper as NativeWrapper } from './StripeProviderWrapper.native';

export const StripeProviderWrapper = Platform.OS === 'web' ? WebWrapper : NativeWrapper;
