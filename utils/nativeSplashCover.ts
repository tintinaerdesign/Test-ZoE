import { NativeModules } from 'react-native';

type ZoeSplashCoverNative = {
  dismiss: () => void;
};

/**
 * Dismiss the native yellow+app-icon cover (MainActivity) in lockstep with SplashScreen.hideAsync.
 * No-op on platforms / builds without the module.
 */
export function dismissNativeSplashCover() {
  const mod = NativeModules.ZoeSplashCover as ZoeSplashCoverNative | undefined;
  mod?.dismiss?.();
}
