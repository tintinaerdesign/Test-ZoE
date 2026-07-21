import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/colors';

type Props = {
  lang: 'en' | 'th';
  setLang: (value: 'en' | 'th') => void;
  nickname?: string;
  logoutLabel: string;
  backLabel?: string;
  /** Highlight C when already on cashier (PlaceOrder). */
  cashierActive?: boolean;
  onBack?: () => void;
  onOpenCashier?: () => void;
  onOpenKitchen?: () => void;
  onLogout?: () => void;
};

/**
 * Shared top nav for PlaceOrder + MenuScreen — compact, same layout.
 * [←] [C] · [ครัว] nickname ····· EN/TH · Logout
 */
export function StaffNav({
  lang,
  setLang,
  nickname,
  logoutLabel,
  backLabel = 'Back',
  cashierActive = false,
  onBack,
  onOpenCashier,
  onOpenKitchen,
  onLogout,
}: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            style={styles.iconBtn}
            onPress={onBack}
            hitSlop={8}
            accessibilityLabel={backLabel}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={18}
              color="#111111"
            />
          </Pressable>
        ) : null}
        {onOpenCashier || cashierActive ? (
          <Pressable
            style={[
              styles.cashierBtn,
              cashierActive && styles.cashierBtnActive,
            ]}
            onPress={onOpenCashier}
            disabled={!onOpenCashier || cashierActive}
            hitSlop={8}
            accessibilityLabel="Cashier"
          >
            <Text
              style={[
                styles.cashierLetter,
                cashierActive && styles.cashierLetterActive,
              ]}
            >
              C
            </Text>
          </Pressable>
        ) : null}
        {onOpenKitchen ? (
          <Pressable
            style={styles.iconBtn}
            onPress={onOpenKitchen}
            hitSlop={8}
            accessibilityLabel="Kitchen"
          >
            <MaterialCommunityIcons
              name="pot-steam"
              size={16}
              color="#111111"
            />
          </Pressable>
        ) : null}
        {nickname?.trim() ? (
          <Text style={styles.nickname} numberOfLines={1}>
            {nickname.trim()}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <View style={styles.langToggle}>
          <Pressable
            style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
            onPress={() => setLang('en')}
          >
            <Text
              style={[styles.langText, lang === 'en' && styles.langTextActive]}
            >
              EN
            </Text>
          </Pressable>
          <Pressable
            style={[styles.langBtn, lang === 'th' && styles.langBtnActive]}
            onPress={() => setLang('th')}
          >
            <Text
              style={[styles.langText, lang === 'th' && styles.langTextActive]}
            >
              TH
            </Text>
          </Pressable>
        </View>
        {onLogout ? (
          <Pressable
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && styles.logoutBtnPressed,
            ]}
            onPress={onLogout}
            hitSlop={8}
            accessibilityLabel={logoutLabel}
          >
            <MaterialCommunityIcons
              name="logout"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.logoutText}>{logoutLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashierBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1A237E',
    borderWidth: 1.5,
    borderColor: '#3949AB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashierBtnActive: {
    backgroundColor: '#0D47A1',
    borderColor: colors.primary,
  },
  cashierLetter: {
    color: '#E8EAF6',
    fontSize: 15,
    fontWeight: '900',
  },
  cashierLetterActive: {
    color: colors.primary,
  },
  nickname: {
    color: '#9A9A9A',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 72,
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  langBtn: {
    minWidth: 34,
    minHeight: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  langBtnActive: {
    backgroundColor: colors.primary,
  },
  langText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '800',
  },
  langTextActive: {
    color: '#111111',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,230,0,0.35)',
  },
  logoutBtnPressed: {
    opacity: 0.85,
  },
  logoutText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
