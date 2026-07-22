import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinModal } from '../components/PinModal';
import { colors } from '../utils/colors';
import {
  FOUNDER_ADMIN,
  isFounderStaffId,
  roleNeedsFounderPin,
  STAFF_ROLES,
  type StaffRole,
} from '../utils/sessionStorage';

const ROLE_IMAGES: Partial<Record<StaffRole | 'Founder admin', ImageSourcePropType>> = {
  Waiter: require('../assets/role-waiter.png'),
  Cashier: require('../assets/role-cashier.png'),
  Kitchen: require('../assets/role-kitchen.png'),
  Admin: require('../assets/role-admin.png'),
  'Founder admin': require('../assets/role-founder-admin.png'),
};

type Props = {
  lang: 'en' | 'th';
  setLang: (value: 'en' | 'th') => void;
  staffId?: string;
  initialNickname?: string;
  initialRole?: StaffRole | '';
  onContinue: (nickname: string, role: StaffRole) => void;
  onBack?: () => void;
  onReady?: () => void;
};

const COPY = {
  en: {
    title: 'Set nickname',
    subtitle: 'This name shows on orders',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Your nickname',
    needNickname: 'Please enter a nickname',
    role: 'Role',
    needRole: 'Please select a role',
    continue: 'Continue',
    back: 'Back',
    loggedInAs: 'id',
    founderBadge: 'Founder admin',
    founderHint: 'You are the Founder admin — no approval PIN needed.',
    needsApproval: 'Needs Founder admin PIN',
    founderPinTitle: 'Founder admin PIN',
    founderPinHint: 'Enter Founder admin PIN to unlock this role',
  },
  th: {
    title: 'ตั้งชื่อเล่น',
    subtitle: 'ชื่อนี้จะแสดงบนออเดอร์',
    nickname: 'ชื่อเล่น',
    nicknamePlaceholder: 'ชื่อเล่นของคุณ',
    needNickname: 'กรุณากรอกชื่อเล่น',
    role: 'ตำแหน่ง',
    needRole: 'กรุณาเลือกตำแหน่ง',
    continue: 'ถัดไป',
    back: 'กลับ',
    loggedInAs: 'id',
    founderBadge: 'Founder admin',
    founderHint: 'คุณคือ Founder admin — ไม่ต้องใช้รหัสยืนยัน',
    needsApproval: 'ต้องใช้รหัส Founder admin',
    founderPinTitle: 'รหัส Founder admin',
    founderPinHint: 'กรอกรหัส PIN ของ Founder admin เพื่อปลดล็อกตำแหน่งนี้',
  },
};

/**
 * After login — pick display nickname + role before entering the floor.
 * Cashier / Kitchen / Admin require Founder admin (tintin) PIN.
 */
export function SetNickname({
  lang,
  setLang,
  staffId = '',
  initialNickname = '',
  initialRole = '',
  onContinue,
  onBack,
  onReady,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = COPY[lang];
  const isFounder = isFounderStaffId(staffId);
  const [nickname, setNickname] = useState(
    initialNickname || (isFounder ? 'Tintin' : ''),
  );
  const [role, setRole] = useState<StaffRole | ''>(
    isFounder ? 'Admin' : initialRole,
  );
  const [needName, setNeedName] = useState(false);
  const [needRole, setNeedRole] = useState(false);
  const [founderPinOpen, setFounderPinOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{
    nickname: string;
    role: StaffRole;
  } | null>(null);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  function finish(name: string, selectedRole: StaffRole) {
    Keyboard.dismiss();
    onContinue(name, selectedRole);
  }

  function submit() {
    const trimmed = nickname.trim();
    let ok = true;
    if (!trimmed) {
      setNeedName(true);
      ok = false;
    }
    if (!role) {
      setNeedRole(true);
      ok = false;
    }
    if (!ok || !role) return;

    // Founder admin (tintin) — always Admin, no PIN gate.
    if (isFounder) {
      finish(trimmed, 'Admin');
      return;
    }

    // Cashier / Kitchen / Admin need Founder admin PIN.
    if (roleNeedsFounderPin(role)) {
      setPendingSubmit({ nickname: trimmed, role });
      setFounderPinOpen(true);
      return;
    }

    finish(trimmed, role);
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <PinModal
        visible={founderPinOpen}
        lang={lang}
        expectedPin={FOUNDER_ADMIN.pin}
        title={t.founderPinTitle}
        hint={t.founderPinHint}
        onSubmit={() => {
          const pending = pendingSubmit;
          setFounderPinOpen(false);
          setPendingSubmit(null);
          if (pending) finish(pending.nickname, pending.role);
        }}
        onClose={() => {
          setFounderPinOpen(false);
          setPendingSubmit(null);
        }}
      />

      <View style={styles.topBar}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.backBtnPressed,
            ]}
            onPress={onBack}
            hitSlop={8}
            accessibilityLabel={t.back}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color="#111111"
            />
            <Text style={styles.backBtnText}>{t.back}</Text>
          </Pressable>
        ) : (
          <View />
        )}
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
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
        {staffId ? (
          <Text style={styles.staffIdHint}>
            {t.loggedInAs}: {staffId}
          </Text>
        ) : null}

        {isFounder ? (
          <View style={styles.founderBanner}>
            <Text style={styles.founderBannerTitle}>{t.founderBadge}</Text>
            <Text style={styles.founderBannerHint}>{t.founderHint}</Text>
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>{t.nickname}</Text>
        <TextInput
          value={nickname}
          onChangeText={(value) => {
            setNickname(value);
            setNeedName(false);
          }}
          placeholder={t.nicknamePlaceholder}
          placeholderTextColor="#888"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={24}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={[styles.nicknameInput, needName && styles.nicknameInputError]}
        />
        {needName ? <Text style={styles.error}>{t.needNickname}</Text> : null}

        <Text style={[styles.fieldLabel, styles.roleLabel]}>{t.role}</Text>
        {isFounder ? (
          <View style={styles.founderRoleCard}>
            <Image
              source={ROLE_IMAGES['Founder admin']}
              style={styles.founderRoleImage}
              resizeMode="cover"
            />
            <View style={styles.founderRoleOverlay}>
              <Text style={styles.founderRoleLabel}>{FOUNDER_ADMIN.label}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.roleGrid}>
            {STAFF_ROLES.map((option) => {
              const active = role === option;
              const locked = roleNeedsFounderPin(option);
              const image = ROLE_IMAGES[option];
              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [
                    styles.roleCard,
                    active && styles.roleCardActive,
                    pressed && styles.roleCardPressed,
                  ]}
                  onPress={() => {
                    setRole(option);
                    setNeedRole(false);
                  }}
                >
                  <View style={styles.roleCardArt}>
                    {image ? (
                      <Image
                        source={image}
                        style={styles.roleCardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.roleCardImageFallback} />
                    )}
                  </View>
                  <View style={styles.roleCardOverlay}>
                    <Text
                      style={[
                        styles.roleCardTitle,
                        active && styles.roleCardTitleActive,
                      ]}
                    >
                      {option}
                    </Text>
                    {locked ? (
                      <Text style={styles.roleCardHint}>{t.needsApproval}</Text>
                    ) : null}
                  </View>
                  {active ? (
                    <View style={styles.roleCardSelected} pointerEvents="none">
                      <View style={styles.roleCardCheck}>
                        <MaterialCommunityIcons
                          name="check-bold"
                          size={36}
                          color="#111111"
                        />
                      </View>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
        {needRole ? <Text style={styles.error}>{t.needRole}</Text> : null}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.continueBtn,
          pressed && styles.continueBtnPressed,
        ]}
        onPress={submit}
      >
        <Text style={styles.continueText}>{t.continue}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  backBtnPressed: {
    opacity: 0.85,
  },
  backBtnText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '800',
  },
  langToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#111111',
    overflow: 'hidden',
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  langBtnActive: {
    backgroundColor: '#111111',
  },
  langText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
  },
  langTextActive: {
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 24,
    paddingTop: 24,
  },
  title: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: '#333333',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  staffIdHint: {
    color: '#555555',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  founderBanner: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#111111',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 4,
  },
  founderBannerTitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  founderBannerHint: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  roleLabel: {
    marginTop: 16,
  },
  nicknameInput: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    color: '#111111',
    fontSize: 18,
    fontWeight: '800',
  },
  nicknameInputError: {
    borderColor: '#C62828',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleCard: {
    width: '47%',
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#111111',
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  roleCardActive: {
    borderColor: '#111111',
    borderWidth: 4,
  },
  roleCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  roleCardArt: {
    ...StyleSheet.absoluteFillObject,
  },
  roleCardImage: {
    width: '100%',
    height: '100%',
  },
  roleCardImageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#222222',
  },
  roleCardSelected: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 3,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  roleCardCheck: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 64,
    height: 64,
    marginTop: -32,
    marginLeft: -32,
    borderRadius: 32,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  roleCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  roleCardTitleActive: {
    color: colors.primary,
  },
  roleCardHint: {
    marginTop: 2,
    color: '#DDDDDD',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  founderRoleCard: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 340,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#111111',
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  founderRoleImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  founderRoleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  founderRoleLabel: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  error: {
    color: '#B71C1C',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  continueBtn: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnPressed: {
    opacity: 0.88,
  },
  continueText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
});
