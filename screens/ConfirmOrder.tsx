import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuccessPopup } from '../components/SuccessPopup';
import { Text, TextInput } from '../components/UiText';
import { EGG_ADDON, findMenuItem } from '../data/menu';
import { colors } from '../utils/colors';
import { formatBaht } from '../utils/format';
import { persistPaymentEvidence } from '../utils/paymentEvidenceStorage';

const LANGUAGE = {
  en: {
    title: 'Confirm Order',
    table: 'Table',
    tableHint: 'Enter table number',
    tablePlaceholder: 'table?',
    subtotal: 'Subtotal',
    items: 'items',
    addEgg: 'egg',
    back: 'Back',
    qr: 'QR',
    cashAwait: 'Cash - Await',
    orderPlaced: 'Order placed!',
    empty: 'No items to confirm.',
    needTable: 'Please enter a table number.',
    cameraDenied: 'Camera permission is required to take payment evidence.',
    ok: 'OK',
  },
  th: {
    title: 'ยืนยันออเดอร์',
    table: 'โต๊ะ',
    tableHint: 'พิมพ์ชื่อหรือเลขโต๊ะ',
    tablePlaceholder: 'เลขโต๊ะ',
    subtotal: 'รวม',
    items: 'รายการ',
    addEgg: 'ไข่',
    back: 'กลับ',
    qr: 'QR',
    cashAwait: 'เงินสด รอจ่ายเงิน',
    orderPlaced: 'สั่งอาหารเรียบร้อยแล้ว!',
    empty: 'ไม่มีรายการให้ยืนยัน',
    needTable: 'กรุณาระบุเลขโต๊ะ',
    cameraDenied: 'ต้องอนุญาตกล้องเพื่อถ่ายหลักฐานการชำระเงิน',
    ok: 'ตกลง',
  },
};

type Props = {
  cart: Record<string, number>;
  cartNotes?: Record<string, string>;
  cartEggs?: Record<string, number>;
  tableNumber: string;
  setTableNumber: (value: string) => void;
  lang: 'en' | 'th';
  onBack: () => void;
  onConfirmed: (
    paymentMethod: 'qr' | 'cash',
    paymentEvidenceUri?: string,
  ) => void;
};

export function ConfirmOrder({
  cart,
  cartNotes = {},
  cartEggs = {},
  tableNumber,
  setTableNumber,
  lang,
  onBack,
  onConfirmed,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = LANGUAGE[lang];
  const [successDetail, setSuccessDetail] = useState<string | null>(null);
  const [pendingMethod, setPendingMethod] = useState<'qr' | 'cash' | null>(
    null,
  );
  const [pendingEvidenceUri, setPendingEvidenceUri] = useState<string | null>(
    null,
  );
  const hasTable = tableNumber.trim().length > 0;

  function itemName(item: { name: string; nameTh: string }) {
    return lang === 'th' ? item.nameTh : item.name;
  }

  const lines = Object.entries(cart)
    .filter(([key, quantity]) => quantity > 0 && key !== EGG_ADDON.id)
    .map(([key, quantity]) => {
      const [menuItemId, optionId] = key.split(':');
      if (menuItemId === 'egg') return null;
      const item = findMenuItem(menuItemId);
      if (!item) return null;
      const option = item.options?.find((entry) => entry.id === optionId);
      const note = cartNotes[key]?.trim();
      const eggCount = cartEggs[key] ?? 0;
      return {
        key,
        quantity,
        price: item.price,
        note,
        eggCount,
        image: item.image as ImageSourcePropType | undefined,
        name: option
          ? `${itemName(item)} (${itemName(option)})`
          : itemName(item),
      };
    })
    .filter((line) => line != null);

  const eggTotal = lines.reduce((sum, line) => sum + line.eggCount, 0);
  const subtotal =
    lines.reduce((sum, line) => sum + line.price * line.quantity, 0) +
    eggTotal * EGG_ADDON.price;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  function dismissKeyboard() {
    Keyboard.dismiss();
  }

  /** Back camera evidence — same flow for QR and cash. */
  async function capturePaymentEvidence(method: 'qr' | 'cash') {
    if (!tableNumber.trim()) {
      Alert.alert(t.needTable);
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.cameraDenied);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.back,
      quality: 0.7,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    let storedUri = result.assets[0].uri;
    try {
      storedUri = await persistPaymentEvidence(storedUri);
    } catch {
      // Keep camera URI if copy to document storage fails.
    }

    finishOrder(method, storedUri);
  }

  function finishOrder(method: 'qr' | 'cash', evidenceUri: string) {
    setPendingMethod(method);
    setPendingEvidenceUri(evidenceUri);
    const methodLabel = method === 'qr' ? 'QR' : 'Cash - Await';
    setSuccessDetail(
      [`${t.table} ${tableNumber.trim()}`, formatBaht(subtotal), methodLabel].join(
        ' · ',
      ),
    );
  }

  function finishSuccess() {
    const method = pendingMethod ?? 'cash';
    const evidenceUri = pendingEvidenceUri ?? undefined;
    setSuccessDetail(null);
    setPendingMethod(null);
    setPendingEvidenceUri(null);
    onConfirmed(method, evidenceUri);
  }

  return (
    <Pressable
      style={[styles.screen, { paddingTop: insets.top + 14 }]}
      onPress={dismissKeyboard}
    >
      <SuccessPopup
        visible={successDetail != null}
        title={t.orderPlaced}
        detail={successDetail ?? ''}
        okLabel={t.ok}
        onClose={finishSuccess}
      />
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={styles.back}>{t.back}</Text>
        </Pressable>
        <Text style={styles.title}>{t.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tableBlock}>
        <Text style={styles.tableLabel}>{t.table}</Text>
        <TextInput
          value={tableNumber}
          onChangeText={setTableNumber}
          placeholder={t.tablePlaceholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          returnKeyType="done"
          showSoftInputOnFocus
          blurOnSubmit
          onSubmitEditing={dismissKeyboard}
          style={styles.tableInput}
        />
        <Text style={styles.tableHint}>{t.tableHint}</Text>
      </View>

      <FlatList
        data={lines}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={dismissKeyboard}
        ListEmptyComponent={<Text style={styles.empty}>{t.empty}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.image ? (
              <Image
                source={item.image}
                style={styles.rowImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.rowImagePlaceholder} />
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.92)', 'rgba(0,0,0,0.55)', 'transparent']}
              locations={[0, 0.45, 0.85]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.rowOverlay}
              pointerEvents="none"
            />
            <View style={styles.rowContent}>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>
                  {formatBaht(
                    item.price * item.quantity +
                      item.eggCount * EGG_ADDON.price,
                  )}
                </Text>
                {item.eggCount > 0 ? (
                  <Text style={styles.eggTag}>
                    +{t.addEgg}×{item.eggCount}
                  </Text>
                ) : null}
                {item.note ? (
                  <Text style={styles.note} numberOfLines={2}>
                    {item.note}
                  </Text>
                ) : null}
                <Text style={styles.qty}>× {item.quantity}</Text>
              </View>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.subtotalRow}>
          <View style={styles.subtotalLeft}>
            <Text style={styles.subtotalLabel}>{t.subtotal}</Text>
            <Text style={styles.subtotalCount}>
              {itemCount} {t.items}
            </Text>
          </View>
          <Text style={styles.subtotalValue}>{formatBaht(subtotal)}</Text>
        </View>

        {hasTable ? (
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.actionButton,
                lines.length === 0 && styles.actionDisabled,
              ]}
              disabled={lines.length === 0}
              onPress={() => capturePaymentEvidence('qr')}
            >
              <MaterialCommunityIcons
                name="camera"
                size={22}
                color="#000000"
              />
              <Text style={styles.actionText}>{t.qr}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.actionButton,
                lines.length === 0 && styles.actionDisabled,
              ]}
              disabled={lines.length === 0}
              onPress={() => capturePaymentEvidence('cash')}
            >
              <MaterialCommunityIcons
                name="cash"
                size={22}
                color="#000000"
              />
              <Text style={styles.actionText}>{t.cashAwait}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  back: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 64,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  headerSpacer: {
    minWidth: 64,
  },
  tableBlock: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 230, 0, 0.08)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 8,
  },
  tableLabel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  tableInput: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 230, 0, 0.45)',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 14,
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  tableHint: {
    color: '#C8C070',
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 10,
    flexGrow: 1,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  row: {
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  rowImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  rowImagePlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1A1A1A',
  },
  rowOverlay: {
    ...StyleSheet.absoluteFill,
  },
  rowContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1,
    maxWidth: '72%',
  },
  rowInfo: {
    gap: 3,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  note: {
    color: '#E8E090',
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  eggTag: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  qty: {
    color: '#D0D0D0',
    fontSize: 14,
    fontWeight: '600',
  },
  price: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  subtotalLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  subtotalCount: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  subtotalValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
