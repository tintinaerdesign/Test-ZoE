import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoteModal } from '../components/NoteModal';
import { OptionsModal } from '../components/OptionsModal';
import { StaffNav } from '../components/StaffNav';
import { afterFirstPaint } from '../utils/schedule';
import { isOptionAvailable } from '../data/ingredients';
import {
  EGG_ADDON,
  MENU,
  findMenuItem,
  type KitchenStation,
  type MenuItem,
} from '../data/menu';
import { colors } from '../utils/colors';
import { formatBaht } from '../utils/format';

const LANGUAGE = {
  en: {
    menu: 'Menu',
    search: 'Search',
    cancelAll: 'Cancel all',
    addEgg: 'egg',
    addNotes: 'Add notes',
    subtotal: 'Subtotal',
    items: 'items',
    placeOrder: 'Place Order',
    orderPlaced: 'Order placed',
    chooseOption: 'Choose option',
    cancel: 'Cancel',
    logout: 'Logout',
    back: 'Back',
    soldOut: 'Sold out',
  },
  th: {
    menu: 'เมนู',
    search: 'ค้นหา',
    cancelAll: 'ยกเลิกทั้งหมด',
    addEgg: 'ไข่',
    addNotes: 'เพิ่มโน้ต',
    subtotal: 'รวม',
    items: 'รายการ',
    placeOrder: 'สั่งอาหาร',
    orderPlaced: 'สั่งอาหารแล้ว',
    chooseOption: 'เลือกส่วนผสม',
    cancel: 'ยกเลิก',
    logout: 'ออก',
    back: 'กลับ',
    soldOut: 'Sold out',
  },
};

function cartKey(menuItemId: string, optionId?: string) {
  return optionId ? `${menuItemId}:${optionId}` : menuItemId;
}

type Props = {
  cart: Record<string, number>;
  setCart: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
  cartNotes: Record<string, string>;
  setCartNotes: (
    updater: (prev: Record<string, string>) => Record<string, string>,
  ) => void;
  cartEggs: Record<string, number>;
  setCartEggs: (
    updater: (prev: Record<string, number>) => Record<string, number>,
  ) => void;
  lang: 'en' | 'th';
  setLang: (value: 'en' | 'th') => void;
  nickname?: string;
  unavailableIngredients?: string[];
  unavailableIds?: string[];
  onBack?: () => void;
  onPlaceOrder: () => void;
  onOpenCashier?: () => void;
  onOpenKitchen?: () => void;
  onLogout?: () => void;
  /** Menu list painted — splash stays until then (not just outer shell layout). */
  onReady?: () => void;
};

export function MenuScreen({
  cart,
  setCart,
  cartNotes,
  setCartNotes,
  cartEggs,
  setCartEggs,
  lang,
  setLang,
  nickname,
  unavailableIngredients = [],
  unavailableIds = [],
  onBack,
  onPlaceOrder,
  onOpenCashier,
  onOpenKitchen,
  onLogout,
  onReady,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [pickerItem, setPickerItem] = useState<MenuItem | null>(null);
  const [noteKey, setNoteKey] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [eggPopupCount, setEggPopupCount] = useState<number | null>(null);
  const readySent = useRef(false);
  const searchRef = useRef<TextInput>(null);
  const eggPopupAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Cart sheet: tall when open, list always has a bounded height so it can scroll.
  const cartSheetMaxHeight = Math.round(windowHeight * 0.72);
  const cartFooterBlock = 130 + (keyboardHeight > 0 ? 12 : insets.bottom);
  const cartListMaxHeight = Math.max(
    120,
    cartSheetMaxHeight - cartFooterBlock - 28,
  );
  function showEggPopup(count: number) {
    setEggPopupCount(count);
    eggPopupAnim.stopAnimation();
    eggPopupAnim.setValue(0);
    Animated.sequence([
      Animated.spring(eggPopupAnim, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(eggPopupAnim, {
        toValue: 0,
        duration: 80,
        delay: 60,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setEggPopupCount(null);
    });
  }

  function addEgg(lineKey: string) {
    const nextCount = (cartEggs[lineKey] ?? 0) + 1;
    setCartEggs((prev) => ({
      ...prev,
      [lineKey]: nextCount,
    }));
    showEggPopup(nextCount);
  }

  function removeEgg(lineKey: string) {
    setCartEggs((prev) => {
      const current = prev[lineKey] ?? 0;
      if (current <= 0) return prev;
      const next = { ...prev };
      if (current <= 1) delete next[lineKey];
      else next[lineKey] = current - 1;
      return next;
    });
  }

  function openSearchKeyboard() {
    searchRef.current?.focus();
  }

  function markMenuReady() {
    if (readySent.current || !onReady) return;
    readySent.current = true;
    afterFirstPaint(() => {
      onReady();
    });
  }

  const t = LANGUAGE[lang];

  function itemName(item: { name: string; nameTh: string }) {
    return lang === 'th' ? item.nameTh : item.name;
  }

  const query = search.trim().toLowerCase();
  const unavailable = new Set(unavailableIds);

  function isMenuSoldOut(item: MenuItem) {
    if (unavailable.has(item.id)) return true;
    if (!item.options || item.options.length === 0) return false;
    return item.options.every(
      (option) => !isOptionAvailable(option, unavailableIngredients),
    );
  }

  const visibleMenu = MENU.filter((item) => {
    if (!query) return true;
    const needle = search.trim();
    return (
      item.name.toLowerCase().includes(query) ||
      item.nameTh.includes(needle) ||
      (item.aliases?.some((alias) => alias.toLowerCase().includes(query)) ??
        false)
    );
  });

  const cartLines = Object.entries(cart)
    .filter(([key, quantity]) => quantity > 0 && key !== EGG_ADDON.id)
    .map(([key, quantity]) => {
      const [menuItemId, optionId] = key.split(':');
      const item = findMenuItem(menuItemId);
      if (!item) return null;
      const option = item.options?.find((entry) => entry.id === optionId);
      const station: KitchenStation = item.station ?? 'main';
      return {
        key,
        quantity,
        price: item.price,
        station,
        note: cartNotes[key]?.trim() ?? '',
        eggCount: cartEggs[key] ?? 0,
        name: option
          ? `${itemName(item)} (${itemName(option)})`
          : itemName(item),
      };
    })
    .filter((line) => line != null);

  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const eggTotalCount = cartLines.reduce((sum, line) => sum + line.eggCount, 0);
  const subtotal =
    cartLines.reduce((sum, line) => sum + line.price * line.quantity, 0) +
    eggTotalCount * EGG_ADDON.price;

  useEffect(() => {
    if (cartOpen && cartCount > 0) {
      Keyboard.dismiss();
    }
  }, [cartOpen, cartCount]);

  function addToCart(menuItemId: string, optionId?: string) {
    const key = cartKey(menuItemId, optionId);
    setCart((prev) => ({
      ...prev,
      [key]: (prev[key] ?? 0) + 1,
    }));
    setCartOpen(true);
    setPickerItem(null);
  }

  function onPressMenuItem(item: MenuItem) {
    if (isMenuSoldOut(item)) return;
    if (item.options && item.options.length > 0) {
      setPickerItem(item);
      return;
    }
    addToCart(item.id);
  }

  function setQuantity(key: string, quantity: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[key];
      } else {
        next[key] = quantity;
      }
      // Drop legacy global egg cart key if present.
      delete next[EGG_ADDON.id];
      return next;
    });
    if (quantity <= 0) {
      setCartNotes((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setCartEggs((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function saveNote(note: string) {
    if (!noteKey) return;
    setCartNotes((prev) => {
      const next = { ...prev };
      if (!note) delete next[noteKey];
      else next[noteKey] = note;
      return next;
    });
    setNoteKey(null);
  }

  const noteLine = noteKey
    ? cartLines.find((line) => line.key === noteKey)
    : null;

  function placeOrder() {
    setCartOpen(false);
    onPlaceOrder();
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top + 14 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={styles.navWrap}>
          <StaffNav
            lang={lang}
            setLang={setLang}
            nickname={nickname}
            logoutLabel={t.logout}
            backLabel={t.back}
            onBack={onBack}
            onOpenCashier={onOpenCashier}
            onOpenKitchen={onOpenKitchen}
            onLogout={onLogout}
          />
        </View>

        <Pressable style={styles.searchWrap} onPress={openSearchKeyboard}>
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder={t.search}
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            autoCapitalize="none"
            showSoftInputOnFocus
            keyboardType="default"
            returnKeyType="search"
            blurOnSubmit={false}
            style={styles.search}
            onFocus={openSearchKeyboard}
          />
          {search.length > 0 ? (
            <Pressable
              style={styles.searchClear}
              onPress={() => {
                setSearch('');
                Keyboard.dismiss();
              }}
              hitSlop={8}
              accessibilityLabel={t.cancel}
            >
              <Text style={styles.searchClearText}>×</Text>
            </Pressable>
          ) : null}
        </Pressable>

        <FlatList
          data={visibleMenu}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={(_w, h) => {
            if (h > 0) markMenuReady();
          }}
          contentContainerStyle={[
            styles.list,
            cartOpen && cartCount > 0 && styles.listWithCart,
          ]}
          renderItem={({ item }) => {
            const soldOut = isMenuSoldOut(item);
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  !soldOut && pressed && styles.cardHover,
                  soldOut && styles.cardSoldOut,
                ]}
                disabled={soldOut}
                onPress={() => onPressMenuItem(item)}
              >
                {item.image ? (
                  <Image
                    source={item.image}
                    style={[styles.cardImage, soldOut && styles.cardImageDim]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.cardImagePlaceholder} />
                )}

                <LinearGradient
                  colors={[
                    'rgba(0,0,0,0.92)',
                    'rgba(0,0,0,.55)',
                    'transparent',
                  ]}
                  locations={[0, 0.42, 0.78]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.cardOverlay}
                  pointerEvents="none"
                />

                <View style={styles.cardInfo}>
                  <Text
                    style={[styles.itemName, soldOut && styles.itemNameSoldOut]}
                  >
                    {itemName(item)}
                  </Text>
                  <Text
                    style={[
                      styles.itemPrice,
                      soldOut && styles.itemPriceSoldOut,
                    ]}
                  >
                    {formatBaht(item.price)}
                  </Text>
                </View>

                {soldOut ? (
                  <View style={styles.soldOutBadge} pointerEvents="none">
                    <MaterialIcons name="block" size={32} color="#FF8A80" />
                    <Text style={styles.soldOutText}>{t.soldOut}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      </KeyboardAvoidingView>

      <OptionsModal
        item={pickerItem}
        title={pickerItem ? itemName(pickerItem) : ''}
        subtitle={t.chooseOption}
        cancelLabel={t.cancel}
        soldOutLabel={lang === 'th' ? 'หมด' : 'Sold out'}
        unavailableIngredients={unavailableIngredients}
        optionLabel={itemName}
        onSelect={(optionId) => {
          if (pickerItem) addToCart(pickerItem.id, optionId);
        }}
        onClose={() => setPickerItem(null)}
      />

      <NoteModal
        visible={noteKey != null}
        lang={lang}
        itemName={noteLine?.name ?? ''}
        initialNote={noteKey ? (cartNotes[noteKey] ?? '') : ''}
        onSubmit={saveNote}
        onClose={() => setNoteKey(null)}
      />

      {cartOpen && cartCount > 0 ? (
        <View
          style={[
            styles.cartSheet,
            {
              maxHeight: cartSheetMaxHeight,
              bottom: Platform.OS === 'ios' ? keyboardHeight : 0,
              paddingBottom: (keyboardHeight > 0 ? 12 : insets.bottom) + 16,
            },
          ]}
          onTouchStart={() => Keyboard.dismiss()}
        >
          <FlatList
            data={cartLines}
            keyExtractor={(item) => item.key}
            style={[styles.cartList, { maxHeight: cartListMaxHeight }]}
            contentContainerStyle={styles.cartListContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator
            renderItem={({ item }) => (
              <View style={styles.cartRow}>
                <View style={styles.cartRowInfo}>
                  <Text style={styles.cartName}>{item.name}</Text>
                  {item.note ? (
                    <Text style={styles.cartNote} numberOfLines={2}>
                      {item.note}
                    </Text>
                  ) : null}
                  <View style={styles.cartPriceRow}>
                    <Text style={styles.cartPrice}>
                      {formatBaht(item.price * item.quantity)}
                    </Text>
                    {item.station === 'main' ? (
                      <Pressable
                        style={[
                          styles.addEggButton,
                          item.eggCount > 0 && styles.addEggButtonActive,
                        ]}
                        onPress={() => addEgg(item.key)}
                        onLongPress={() => removeEgg(item.key)}
                        hitSlop={8}
                        accessibilityLabel={`${t.addEgg} ×${item.eggCount || 1}`}
                      >
                        <MaterialCommunityIcons
                          name="egg-outline"
                          size={14}
                          color="#111111"
                        />
                        <Text style={styles.addEggText}>
                          {t.addEgg}×{Math.max(item.eggCount, 1)}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[
                        styles.addNotesButton,
                        item.note ? styles.addNotesButtonActive : null,
                      ]}
                      onPress={() => setNoteKey(item.key)}
                      hitSlop={8}
                      accessibilityLabel={t.addNotes}
                    >
                      <MaterialCommunityIcons
                        name="note-text-outline"
                        size={14}
                        color="#111111"
                      />
                      <Text style={styles.addNotesText}>{t.addNotes}</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepButton}
                    onPress={() => setQuantity(item.key, item.quantity - 1)}
                  >
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable
                    style={styles.stepButton}
                    onPress={() => setQuantity(item.key, item.quantity + 1)}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />

          <View style={styles.cartFooter}>
            <View style={styles.subtotalLeft}>
              <Text style={styles.subtotalLabel}>{t.subtotal}</Text>
              <Text style={styles.subtotalCount}>
                {cartCount} {t.items}
              </Text>
            </View>
            <Text style={styles.subtotalValue}>{formatBaht(subtotal)}</Text>
          </View>

          <View style={styles.actionGrid}>
            <Pressable
              style={styles.cancelAllButton}
              onPress={() => {
                setCart(() => ({}));
                setCartNotes(() => ({}));
                setCartEggs(() => ({}));
                setCartOpen(false);
              }}
            >
              <Text style={styles.cancelAllText}>{t.cancelAll}</Text>
            </Pressable>
            <Pressable style={styles.placeOrderButton} onPress={placeOrder}>
              <Text style={styles.placeOrderText}>{t.placeOrder}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {eggPopupCount != null ? (
        <View pointerEvents="none" style={styles.eggPopupLayer}>
          <Animated.View
            style={[
              styles.eggPopup,
              {
                opacity: eggPopupAnim,
                transform: [
                  {
                    scale: eggPopupAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                  {
                    translateY: eggPopupAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.eggPopupPlus}>+1</Text>
            <Text style={styles.eggPopupLabel}>
              {lang === 'th' ? 'ไข่' : 'Egg'}
            </Text>
            <Text style={styles.eggPopupCount}>×{eggPopupCount}</Text>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  navWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
    justifyContent: 'center',
  },
  search: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 16,
    paddingRight: 44,
    color: colors.text,
    fontSize: 16,
  },
  searchClear: {
    position: 'absolute',
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: '600',
    marginTop: -1,
  },
  list: {
    padding: 12,
    gap: 8,
    paddingBottom: 24,
  },
  listWithCart: {
    paddingBottom: 420,
  },
  card: {
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardHover: {
    borderColor: colors.primary,
  },
  cardSoldOut: {
    borderWidth: 2,
    borderColor: '#EF9A9A',
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  cardImageDim: {
    opacity: 0.4,
  },
  cardImagePlaceholder: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.input,
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  cardInfo: {
    position: 'relative',
    zIndex: 2,
    elevation: 2,
    height: '100%',
    justifyContent: 'center',
    gap: 4,
    padding: 16,
    maxWidth: '62%',
  },
  itemName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  itemNameSoldOut: {
    color: '#BDBDBD',
    textDecorationLine: 'line-through',
  },
  itemPrice: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  itemPriceSoldOut: {
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  soldOutBadge: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    zIndex: 4,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  soldOutText: {
    color: '#FFCDD2',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cartSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
    zIndex: 40,
    elevation: 40,
  },
  cartList: {
    flexGrow: 0,
  },
  cartListContent: {
    paddingBottom: 4,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  cartRowInfo: {
    flex: 1,
    gap: 2,
  },
  cartName: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
  cartPrice: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '600',
  },
  cartPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  addEggButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  addEggButtonActive: {
    borderWidth: 1.5,
    borderColor: '#111111',
  },
  addEggText: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '800',
  },
  addNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
  },
  addNotesButtonActive: {
    backgroundColor: '#FFF59D',
    borderColor: '#F9A825',
  },
  addNotesText: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '800',
  },
  cartNote: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepText: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  qty: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },
  cartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  eggPopupLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 50,
  },
  eggPopup: {
    minWidth: 120,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  eggPopupPlus: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '900',
  },
  eggPopupLabel: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  eggPopupCount: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '900',
  },
  subtotalLabel: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  subtotalCount: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
  subtotalValue: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelAllButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelAllText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
  placeOrderButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
});
