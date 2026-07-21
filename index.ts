import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

// Session I/O starts here — before the heavy App module graph evaluates.
import './utils/earlyBootstrap';
import { startupMark } from './utils/startupTiming';
import App from './App';

/**
 * Expo best practice: call in global scope (not inside a component) so the
 * native splash is held before any React frame can auto-dismiss it.
 * https://docs.expo.dev/versions/latest/sdk/splash-screen/
 */
SplashScreen.preventAutoHideAsync().catch(() => undefined);

startupMark('js_module_eval');

registerRootComponent(App);
