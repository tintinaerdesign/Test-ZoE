import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  InteractionManager,
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
import { CashierScreen } from './screens/CashierScreen';
import { ConfirmOrder } from './screens/ConfirmOrder';
import { KitchenToDo } from './screens/KitchenToDo';
import { Login } from './screens/Login';
import { MenuScreen } from './screens/MenuScreen';
import { NoIngredient } from './screens/NoIngredient';
import { PlaceOrder } from './screens/PlaceOrder';
import {
  loadUnavailableIds,
  loadUnavailableIngredients,
  saveUnavailableIds,
  saveUnavailableIngredients,
} from './utils/availabilityStorage';
import { lineFontSources, setLineSeedActive } from './utils/fonts';
import { loadUiCache, saveUiCache } from './utils/localCache';
import {
  ensureStaffAccount,
  loadLoggedIn,
  loadNickname,
  loadPin,
  saveSession,
} from './utils/sessionStorage';
import {
  loadKitchenTickets,
  saveKitchenTickets,
} from './utils/ticketStorage';

const SPLASH_BG = '#FFE600';
/** Keep splash image on screen long enough to cover the black RN surface. */
const SPLASH_HOLD_MS = 1800;

// Instant remove — never fade onto a different surface
SplashScreen.setOptions({ duration: 0, fade: false });

/** Enable LINE Seed for the whole app once faces are loaded (EN + TH). */
function applyLineFontForLang(_lang: 'en' | 'th') {
  setLineSeedActive(true);
}

/**
 * Brand yellow bridge + app-icon — covers black RN surface until ready.
 */
function StartupBridge({ onImageReady }: { onImageReady: () => void }) {
  const { width } = useWindowDimensions();
  const readySent = useRef(false);
  const iconSize = Math.min(220, Math.round(width * 0.42));

  function markImageReady() {
    if (readySent.current) return;
    readySent.current = true;
    onImageReady();
  }

  return (
    <View
      style={styles.bridge}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require('./assets/app-icon.png')}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
        onLoad={markImageReady}
        onLoadEnd={markImageReady}
      />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(lineFontSources);
  const [screen, setScreen] = useState<
    | 'login'
    | 'placeOrder'
    | 'cashier'
    | 'menu'
    | 'confirm'
    | 'kitchen'
    | 'noIngredient'
  >('login');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartNotes, setCartNotes] = useState<Record<string, string>>({});
  const [cartEggs, setCartEggs] = useState<Record<string, number>>({});
  const [tableNumber, setTableNumber] = useState('');
  const [lang, setLang] = useState<'en' | 'th'>('en');
  const [nickname, setNickname] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [hasAccount, setHasAccount] = useState(false);
  const [unavailableIngredients, setUnavailableIngredients] = useState<
    string[]
  >([]);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [kitchenTickets, setKitchenTickets] = useState<KitchenTicket[]>([]);
  const [kitchenPinOpen, setKitchenPinOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const orderSeqRef = useRef(1);

  // 1) splash image first  2) then mount login/menu under it  3) then dismiss
  const [splashImageReady, setSplashImageReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [bridgeVisible, setBridgeVisible] = useState(true);
  const finishingRef = useRef(false);

  useEffect(() => {
    if (!fontsLoaded) return;
    applyLineFontForLang(lang);
  }, [fontsLoaded, lang]);

  /** Hydrate saved session + tickets + cart so UI opens with last data (no empty flash). */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureStaffAccount();
      const [
        loggedIn,
        savedName,
        pin,
        unavailable,
        unavailableMenu,
        tickets,
        uiCache,
      ] = await Promise.all([
        loadLoggedIn(),
        loadNickname(),
        loadPin(),
        loadUnavailableIngredients(),
        loadUnavailableIds(),
        loadKitchenTickets(),
        loadUiCache(),
      ]);
      if (cancelled) return;

      setNickname(savedName);
      setStaffPin(pin);
      setHasAccount(pin.length === 4);
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

      setScreen(loggedIn ? 'placeOrder' : 'login');
      setStorageReady(true);
      setAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    void saveKitchenTickets(kitchenTickets);
  }, [kitchenTickets, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    void saveUiCache({
      cart,
      cartNotes,
      cartEggs,
      tableNumber,
      lang,
      orderSeq: orderSeqRef.current,
    });
  }, [cart, cartNotes, cartEggs, tableNumber, lang, storageReady, kitchenTickets]);

  useEffect(() => {
    if (
      !fontsLoaded ||
      !splashImageReady ||
      !authChecked ||
      !appReady ||
      finishingRef.current
    ) {
      return;
    }
    finishingRef.current = true;

    let cancelled = false;

    const hold = setTimeout(() => {
      if (cancelled) return;

      InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;

        // Hide the native Android/iOS splash (system layer).
        SplashScreen.hideAsync()
          .catch(() => undefined)
          .finally(() => {
            if (cancelled) return;
            // Then remove the JS StartupBridge overlay → reveal app.
            requestAnimationFrame(() => {
              if (!cancelled) setBridgeVisible(false);
            });
          });
      });
    }, SPLASH_HOLD_MS);

    return () => {
      cancelled = true;
      clearTimeout(hold);
    };
  }, [fontsLoaded, splashImageReady, authChecked, appReady]);

  async function handleUnavailableIngredients(names: string[]) {
    setUnavailableIngredients(names);
    await saveUnavailableIngredients(names);
  }

  async function handleUnavailableIds(ids: string[]) {
    setUnavailableIds(ids);
    await saveUnavailableIds(ids);
  }

  async function handleLogin(name: string, pin: string) {
    await saveSession(true, name, pin);
    setNickname(name);
    setStaffPin(pin);
    setHasAccount(true);
    setScreen('placeOrder');
  }

  async function handleLogout() {
    await saveSession(false);
    setCart({});
    setCartNotes({});
    setCartEggs({});
    setTableNumber('');
    setScreen('login');
    if (storageReady) {
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
          hint: 'กรอกรหัส 4 หลัก เพื่อเข้า Kitchen Mode',
        }
      : {
          title: 'Kitchen PIN',
          hint: 'Enter 4-digit PIN to enter Kitchen Mode',
        };

  return (
    <SafeAreaProvider>
      <StatusBar
        style={
          bridgeVisible ? 'dark' : screen === 'login' ? 'dark' : 'light'
        }
      />
      <View style={styles.root}>
        <PinModal
          visible={kitchenPinOpen}
          lang={lang}
          expectedPin={staffPin}
          title={kitchenPinCopy.title}
          hint={kitchenPinCopy.hint}
          onSubmit={enterKitchenAfterPin}
          onClose={() => setKitchenPinOpen(false)}
        />

        {/* First paint under splash — restore session or show login. */}
        {splashImageReady && authChecked && fontsLoaded ? (
          screen === 'login' ? (
            <Login
              lang={lang}
              setLang={setLang}
              isRegister={!hasAccount}
              initialNickname={nickname}
              savedPin={staffPin}
              onLogin={handleLogin}
              onReady={() => setAppReady(true)}
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
              onReady={() => setAppReady(true)}
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
              onReady={() => setAppReady(true)}
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
          )
        ) : null}

        {bridgeVisible ? (
          <StartupBridge onImageReady={() => setSplashImageReady(true)} />
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
  bridge: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
});
