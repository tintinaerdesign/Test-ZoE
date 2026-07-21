import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

import App from './App';

// Hold native splash until the JS bridge is ready (same as production).
SplashScreen.preventAutoHideAsync().catch(() => undefined);

registerRootComponent(App);
