import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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

type Props = {
  lang: 'en' | 'th';
  setLang: (value: 'en' | 'th') => void;
  staffId?: string;
  initialNickname?: string;
  initialRole?: StaffRole | '';
  onContinue: (nickname: string, role: StaffRole) => void;
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
          <View style={[styles.roleChip, styles.roleChipActive, styles.roleChipFull]}>
            <Text style={[styles.roleChipText, styles.roleChipTextActive]}>
              {FOUNDER_ADMIN.label}
            </Text>
          </View>
        ) : (
          <View style={styles.roleGrid}>
            {STAFF_ROLES.map((option) => {
              const active = role === option;
              const locked = roleNeedsFounderPin(option);
              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [
                    styles.roleChip,
                    active && styles.roleChipActive,
                    pressed && styles.roleChipPressed,
                  ]}
                  onPress={() => {
                    setRole(option);
                    setNeedRole(false);
                  }}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      active && styles.roleChipTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                  {locked ? (
                    <Text
                      style={[
                        styles.roleLockHint,
                        active && styles.roleLockHintActive,
                      ]}
                    >
                      {t.needsApproval}
                    </Text>
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
    justifyContent: 'flex-end',
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
  roleChip: {
    minWidth: '47%',
    flexGrow: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  roleChipFull: {
    width: '100%',
    minWidth: '100%',
  },
  roleChipActive: {
    backgroundColor: '#111111',
  },
  roleChipPressed: {
    opacity: 0.88,
  },
  roleChipText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '800',
  },
  roleChipTextActive: {
    color: colors.primary,
  },
  roleLockHint: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleLockHintActive: {
    color: '#BBBBBB',
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
