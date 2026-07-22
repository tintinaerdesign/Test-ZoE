import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PinModal } from './components/PinModal';
import {
  createKitchenTicketFromCart,
  type KitchenTicket,
} from './data/kitchen';
/** Home screens only — keep eager so first paint is fast. */
import { Login } from './screens/Login';
import { PlaceOrder } from './screens/PlaceOrder';
import { SetNickname } from './screens/SetNickname';
import {
  loadUnavailableIds,
  loadUnavailableIngredients,
  saveUnavailableIds,
  saveUnavailableIngredients,
} from './utils/availabilityStorage';
import { earlySessionPromise } from './utils/earlyBootstrap';
import { lineFontSources } from './utils/fonts';
import { loadUiCache, saveUiCache } from './utils/localCache';
import { dismissNativeSplashCover } from './utils/nativeSplashCover';
import { whenIdle } from './utils/schedule';
import { PIN_LENGTH, saveNickname, saveSession, saveStaffRole } from './utils/sessionStorage';
import type { StaffRole } from './utils/sessionStorage';
import {
  startupMark,
  startupSummary,
  timedAsync,
} from './utils/startupTiming';
import {
  loadKitchenTickets,
  saveKitchenTickets,
  subscribeKitchenTickets,
} from './utils/ticketStorage';

/** Lazy: not needed before splash hide — cuts ~js_module_eval cost. */
const CashierScreen = lazy(() =>
  import('./screens/CashierScreen').then((m) => ({ default: m.CashierScreen })),
);
const KitchenToDo = lazy(() =>
  import('./screens/KitchenToDo').then((m) => ({ default: m.KitchenToDo })),
);
const NoIngredient = lazy(() =>
  import('./screens/NoIngredient').then((m) => ({ default: m.NoIngredient })),
);
const MenuScreen = lazy(() =>
  import('./screens/MenuScreen').then((m) => ({ default: m.MenuScreen })),
);
const ConfirmOrder = lazy(() =>
  import('./screens/ConfirmOrder').then((m) => ({ default: m.ConfirmOrder })),
);

const SPLASH_BG = '#FFE600';
/** App chrome behind screens — must NOT be splash yellow or it flashes on navigate. */
const APP_BG = '#0A0A0A';
const APP_ICON = require('./assets/app-icon.png');

/**
 * Expo best practice: call preventAutoHide in index.ts (global scope).
 * Instant hide — no fade onto a black RN surface.
 */
SplashScreen.setOptions({ duration: 0, fade: false });

/**
 * Brand yellow + app-icon overlay kept until hideAsync().
 */
function StartupBridge() {
  const { width } = useWindowDimensions();
  const iconSize = Math.min(220, Math.round(width * 0.42));

  return (
    <View
      style={styles.bridge}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={APP_ICON}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />
    </View>
  );
}

type Screen =
  | 'login'
  | 'setNickname'
  | 'placeOrder'
  | 'cashier'
  | 'menu'
  | 'confirm'
  | 'kitchen'
  | 'noIngredient';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartNotes, setCartNotes] = useState<Record<string, string>>({});
  const [cartEggs, setCartEggs] = useState<Record<string, number>>({});
  const [tableNumber, setTableNumber] = useState('');
  const [lang, setLang] = useState<'en' | 'th'>('en');
  const [staffId, setStaffId] = useState('');
  const [nickname, setNickname] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole | ''>('');
  const [staffPin, setStaffPin] = useState('');
  const [hasAccount, setHasAccount] = useState(false);
  const [unavailableIngredients, setUnavailableIngredients] = useState<
    string[]
  >([]);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [kitchenTickets, setKitchenTickets] = useState<KitchenTicket[]>([]);
  const [kitchenPinOpen, setKitchenPinOpen] = useState(false);

  /** Session keys loaded — enough to choose Login vs PlaceOrder. */
  const [authChecked, setAuthChecked] = useState(false);
  /** First home screen mounted. */
  const [homeReady, setHomeReady] = useState(false);
  /** Splash (native cover + JS bridge) still covering the UI. */
  const [bridgeVisible, setBridgeVisible] = useState(true);

  const orderSeqRef = useRef(1);
  const ticketsHydratedRef = useRef(false);
  const uiCacheHydratedRef = useRef(false);
  const hidingSplashRef = useRef(false);
  const deferredStartedRef = useRef(false);
  const taskMsRef = useRef<Record<string, number>>({});

  // ── Critical path: session only ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      startupMark('critical_hydrate_start');

      const sessionTask = await timedAsync('early_session', () =>
        earlySessionPromise,
      );
      taskMsRef.current.early_session = sessionTask.ms;
      if (cancelled) return;

      const {
        loggedIn,
        staffId: savedId,
        nickname: savedName,
        role: savedRole,
        pin,
      } = sessionTask.value;
      setStaffId(savedId);
      setNickname(savedName);
      setStaffRole(savedRole);
      setStaffPin(pin);
      setHasAccount(pin.length === PIN_LENGTH);
      if (loggedIn) {
        setScreen(
          savedName.trim() && savedRole ? 'placeOrder' : 'setNickname',
        );
      } else {
        setScreen('login');
      }
      setAuthChecked(true);
      startupMark('critical_hydrate_done');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Persist tickets only after deferred hydrate (avoid wiping storage) ─
  useEffect(() => {
    if (!ticketsHydratedRef.current) return;
    void saveKitchenTickets(kitchenTickets);
  }, [kitchenTickets]);

  // ── Multi-device: live order sync via Supabase Realtime ───────────────
  useEffect(() => {
    if (!authChecked) return;
    const unsubscribe = subscribeKitchenTickets((tickets) => {
      setKitchenTickets(tickets);
      let nextSeq = orderSeqRef.current;
      for (const ticket of tickets) {
        const n = parseInt(ticket.orderNo, 10);
        if (Number.isFinite(n) && n >= nextSeq) nextSeq = n + 1;
      }
      orderSeqRef.current = nextSeq;
    });
    return unsubscribe;
  }, [authChecked]);

  useEffect(() => {
    if (!uiCacheHydratedRef.current) return;
    void saveUiCache({
      cart,
      cartNotes,
      cartEggs,
      tableNumber,
      lang,
      orderSeq: orderSeqRef.current,
    });
  }, [cart, cartNotes, cartEggs, tableNumber, lang]);

  // ── Hide splash as soon as Home has mounted (no wait for tickets/fonts) ─
  useEffect(() => {
    if (!authChecked || !homeReady || hidingSplashRef.current) return;
    hidingSplashRef.current = true;
    startupMark('home_ready_hiding_splash');

    let cancelled = false;
    SplashScreen.hideAsync()
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return;
        dismissNativeSplashCover();
        startupMark('splash_hideAsync_done');
        startupSummary(taskMsRef.current);
        setBridgeVisible(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authChecked, homeReady]);

  // ── Deferred: tickets / cache / fonts — start with session ─────────────
  useEffect(() => {
    if (!authChecked || deferredStartedRef.current) return;
    deferredStartedRef.current = true;
    startupMark('deferred_hydrate_start');

    void (async () => {
      const heavy = await timedAsync('deferred_storage', () =>
        Promise.all([
          loadKitchenTickets(),
          loadUnavailableIngredients(),
          loadUnavailableIds(),
          loadUiCache(),
        ]),
      );
      taskMsRef.current.deferred_storage = heavy.ms;

      const [tickets, unavailable, unavailableMenu, uiCache] = heavy.value;

      setUnavailableIngredients(unavailable);
      setUnavailableIds(unavailableMenu);
      setKitchenTickets(tickets);
      setCart(uiCache.cart);
      setCartNotes(uiCache.cartNotes);
      setCartEggs(uiCache.cartEggs);
      setTableNumber(uiCache.tableNumber);
      setLang(uiCache.lang);

      let nextSeq = uiCache.orderSeq;
      for (const ticket of tickets) {
        const n = parseInt(ticket.orderNo, 10);
        if (Number.isFinite(n) && n >= nextSeq) nextSeq = n + 1;
      }
      orderSeqRef.current = nextSeq;

      ticketsHydratedRef.current = true;
      uiCacheHydratedRef.current = true;
      startupMark('deferred_hydrate_done');

      whenIdle(() => {
        void timedAsync('deferred_fonts', () =>
          Font.loadAsync(lineFontSources),
        ).then((fonts) => {
          taskMsRef.current.deferred_fonts = fonts.ms;
          startupMark('fonts_deferred_loaded');
        });
      });
    })();
  }, [authChecked]);

  const onHomeReady = useCallback(() => {
    setHomeReady(true);
  }, []);

  // Prefetch lazy screens after splash so the first tap doesn't flash APP_BG.
  useEffect(() => {
    if (bridgeVisible) return;
    void import('./screens/MenuScreen');
    void import('./screens/CashierScreen');
    void import('./screens/KitchenToDo');
    void import('./screens/ConfirmOrder');
    void import('./screens/NoIngredient');
  }, [bridgeVisible]);

  async function handleUnavailableIngredients(names: string[]) {
    setUnavailableIngredients(names);
    await saveUnavailableIngredients(names);
  }

  async function handleUnavailableIds(ids: string[]) {
    setUnavailableIds(ids);
    await saveUnavailableIds(ids);
  }

  async function handleLogin(id: string, pin: string) {
    await saveSession(true, id, pin);
    setStaffId(id);
    setStaffPin(pin);
    setHasAccount(true);
    setScreen('setNickname');
  }

  async function handleNicknameContinue(name: string, role: StaffRole) {
    await saveNickname(name);
    await saveStaffRole(role);
    setNickname(name);
    setStaffRole(role);
    setScreen('placeOrder');
  }

  async function handleBackToLogin() {
    await saveSession(false);
    setScreen('login');
  }

  async function handleLogout() {
    await saveSession(false);
    setCart({});
    setCartNotes({});
    setCartEggs({});
    setTableNumber('');
    setScreen('login');
    if (uiCacheHydratedRef.current) {
      void saveUiCache({
        cart: {},
        cartNotes: {},
        cartEggs: {},
        tableNumber: '',
        lang,
        orderSeq: orderSeqRef.current,
      });
    }
  }

  function confirmEnterCashier() {
    const title = 'Cashier Mode';
    const message =
      lang === 'th'
        ? 'ยืนยันเข้าสู่โหมดแคชเชียร์?\nจะเห็นการชำระเงินของพนักงานทุกคน'
        : 'Enter Cashier Mode?\nYou will see payments from all staff.';
    const cancel = lang === 'th' ? 'ยกเลิก' : 'Cancel';
    const confirm = lang === 'th' ? 'ยืนยัน' : 'Confirm';
    Alert.alert(title, message, [
      { text: cancel, style: 'cancel' },
      { text: confirm, onPress: () => setScreen('cashier') },
    ]);
  }

  function requestEnterKitchen() {
    setKitchenPinOpen(true);
  }

  function enterKitchenAfterPin() {
    setKitchenPinOpen(false);
    setScreen('kitchen');
  }

  const kitchenPinCopy =
    lang === 'th'
      ? {
          title: 'รหัสครัว',
          hint: 'กรอกรหัส 6 หลัก เพื่อเข้า Kitchen Mode',
        }
      : {
          title: 'Kitchen PIN',
          hint: 'Enter 6-digit PIN to enter Kitchen Mode',
        };

  return (
    <SafeAreaProvider>
      <StatusBar
        style={
          bridgeVisible ||
          screen === 'login' ||
          screen === 'setNickname'
            ? 'dark'
            : 'light'
        }
      />
      <View
        style={[styles.root, bridgeVisible ? styles.rootWhileSplash : null]}
      >
        <PinModal
          visible={kitchenPinOpen}
          lang={lang}
          expectedPin={staffPin}
          title={kitchenPinCopy.title}
          hint={kitchenPinCopy.hint}
          onSubmit={enterKitchenAfterPin}
          onClose={() => setKitchenPinOpen(false)}
        />

        {authChecked ? (
          <Suspense fallback={<View style={styles.screenFallback} />}>
            {screen === 'login' ? (
              <Login
                lang={lang}
                setLang={setLang}
                isRegister={!hasAccount}
                initialStaffId={staffId}
                savedPin={staffPin}
                onLogin={handleLogin}
                onReady={onHomeReady}
              />
            ) : screen === 'setNickname' ? (
              <SetNickname
                lang={lang}
                setLang={setLang}
                staffId={staffId}
                initialNickname={nickname}
                initialRole={staffRole}
                onContinue={handleNicknameContinue}
                onBack={handleBackToLogin}
                onReady={onHomeReady}
              />
            ) : screen === 'placeOrder' ? (
              <PlaceOrder
                tickets={kitchenTickets}
                setTickets={setKitchenTickets}
                lang={lang}
                setLang={setLang}
                nickname={nickname}
                cashierPin={staffPin}
                onPlaceOrder={() => setScreen('menu')}
                onOpenCashier={confirmEnterCashier}
                onOpenKitchen={requestEnterKitchen}
                onLogout={handleLogout}
                onReady={onHomeReady}
              />
            ) : screen === 'cashier' ? (
              <CashierScreen
                tickets={kitchenTickets}
                setTickets={setKitchenTickets}
                lang={lang}
                setLang={setLang}
                nickname={nickname}
                cashierPin={staffPin}
                onBack={() => setScreen('placeOrder')}
                onOpenKitchen={requestEnterKitchen}
                onLogout={handleLogout}
              />
            ) : screen === 'kitchen' ? (
              <KitchenToDo
                tickets={kitchenTickets}
                setTickets={setKitchenTickets}
                onBack={() => setScreen('placeOrder')}
                onOpenNoIngredient={() => setScreen('noIngredient')}
              />
            ) : screen === 'noIngredient' ? (
              <NoIngredient
                unavailableIngredients={unavailableIngredients}
                setUnavailableIngredients={handleUnavailableIngredients}
                unavailableIds={unavailableIds}
                setUnavailableIds={handleUnavailableIds}
                onBack={() => setScreen('kitchen')}
              />
            ) : screen === 'menu' ? (
              <MenuScreen
                cart={cart}
                setCart={setCart}
                cartNotes={cartNotes}
                setCartNotes={setCartNotes}
                cartEggs={cartEggs}
                setCartEggs={setCartEggs}
                lang={lang}
                setLang={setLang}
                nickname={nickname}
                unavailableIngredients={unavailableIngredients}
                unavailableIds={unavailableIds}
                onBack={() => setScreen('placeOrder')}
                onPlaceOrder={() => setScreen('confirm')}
                onOpenCashier={confirmEnterCashier}
                onOpenKitchen={requestEnterKitchen}
                onLogout={handleLogout}
                onReady={onHomeReady}
              />
            ) : (
              <ConfirmOrder
                cart={cart}
                cartNotes={cartNotes}
                cartEggs={cartEggs}
                tableNumber={tableNumber}
                setTableNumber={setTableNumber}
                lang={lang}
                onBack={() => setScreen('menu')}
                onConfirmed={(paymentMethod, paymentEvidenceUri) => {
                  const orderNo = String(orderSeqRef.current++).padStart(3, '0');
                  const ticket = createKitchenTicketFromCart(
                    cart,
                    tableNumber,
                    orderNo,
                    cartNotes,
                    cartEggs,
                    {
                      staffName: nickname,
                      paymentMethod,
                      paymentEvidenceUri,
                    },
                  );
                  if (ticket) {
                    setKitchenTickets((prev) => [ticket, ...prev]);
                  }
                  setCart({});
                  setCartNotes({});
                  setCartEggs({});
                  setTableNumber('');
                  setScreen('placeOrder');
                }}
              />
            )}
          </Suspense>
        ) : null}

        {bridgeVisible ? <StartupBridge /> : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_BG,
  },
  /** Yellow only while app-icon splash is up — then back to dark app chrome. */
  rootWhileSplash: {
    backgroundColor: SPLASH_BG,
  },
  screenFallback: {
    flex: 1,
    backgroundColor: APP_BG,
  },
  bridge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
});
