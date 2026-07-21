import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '../components/UiText';
import { colors } from '../utils/colors';

type PinStep = 'enter' | 'confirm';

type Props = {
  lang: 'en' | 'th';
  setLang: (value: 'en' | 'th') => void;
  /** First launch / no saved PIN → register (PIN twice). */
  isRegister: boolean;
  /** Prefill after logout. */
  initialNickname?: string;
  /** Saved PIN for login mode. */
  savedPin?: string;
  onLogin: (nickname: string, pin: string) => void;
  onReady?: () => void;
};

const COPY = {
  en: {
    titleLogin: 'Staff login',
    titleRegister: 'Create account',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Your nickname',
    needNickname: 'Please enter a nickname',
    hintLogin: 'Enter your 4-digit PIN',
    hintCreate: 'Create a 4-digit PIN',
    hintConfirm: 'Confirm your PIN',
    wrong: 'Incorrect PIN',
    mismatch: 'PINs do not match — try again',
  },
  th: {
    titleLogin: 'เข้าสู่ระบบ',
    titleRegister: 'สมัครใช้งาน',
    nickname: 'ชื่อเล่น',
    nicknamePlaceholder: 'ชื่อเล่นของคุณ',
    needNickname: 'กรุณากรอกชื่อเล่น',
    hintLogin: 'กรอกรหัส PIN 4 หลัก',
    hintCreate: 'ตั้งรหัส PIN 4 หลัก',
    hintConfirm: 'ยืนยันรหัส PIN อีกครั้ง',
    wrong: 'รหัสไม่ถูกต้อง',
    mismatch: 'รหัสไม่ตรงกัน — ลองใหม่',
  },
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;

export function Login({
  lang,
  setLang,
  isRegister,
  initialNickname = '',
  savedPin = '',
  onLogin,
  onReady,
}: Props) {
  const insets = useSafeAreaInsets();
  const t = COPY[lang];
  const [nickname, setNickname] = useState(initialNickname);
  const [pin, setPin] = useState('');
  const [pinStep, setPinStep] = useState<PinStep>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needName, setNeedName] = useState(false);
  const readySent = useRef(false);
  const nicknameRef = useRef(nickname);
  nicknameRef.current = nickname;
  const pinStepRef = useRef(pinStep);
  pinStepRef.current = pinStep;
  const firstPinRef = useRef(firstPin);
  firstPinRef.current = firstPin;

  useEffect(() => {
    setNickname(initialNickname);
  }, [initialNickname]);

  useEffect(() => {
    if (readySent.current || !onReady) return;
    readySent.current = true;
    InteractionManager.runAfterInteractions(() => {
      onReady();
    });
  }, [onReady]);

  useEffect(() => {
    if (pin.length !== 4) return;
    const entered = pin;
    const timer = setTimeout(() => {
      const name = nicknameRef.current.trim();
      if (!name) {
        setNeedName(true);
        setPin('');
        return;
      }

      if (isRegister) {
        if (pinStepRef.current === 'enter') {
          setFirstPin(entered);
          setPinStep('confirm');
          setPin('');
          setError(null);
          return;
        }
        if (entered === firstPinRef.current) {
          Keyboard.dismiss();
          onLogin(name, entered);
        } else {
          setError(t.mismatch);
          setFirstPin('');
          setPinStep('enter');
          setPin('');
        }
        return;
      }

      if (entered === savedPin) {
        Keyboard.dismiss();
        onLogin(name, entered);
      } else {
        setError(t.wrong);
        setPin('');
      }
    }, 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function pressKey(key: string) {
    if (key === '') return;
    Keyboard.dismiss();
    setError(null);
    setNeedName(false);
    if (key === '⌫') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    setPin((prev) => (prev.length >= 4 ? prev : prev + key));
  }

  const title = isRegister ? t.titleRegister : t.titleLogin;
  const hint = isRegister
    ? pinStep === 'confirm'
      ? t.hintConfirm
      : t.hintCreate
    : t.hintLogin;

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

      <View style={styles.hero}>
        <Image
          source={require('../assets/app-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>{title}</Text>
      </View>

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
        onSubmitEditing={() => Keyboard.dismiss()}
        style={[styles.nicknameInput, needName && styles.nicknameInputError]}
      />
      {needName ? <Text style={styles.error}>{t.needNickname}</Text> : null}

      <Text style={styles.hint}>{hint}</Text>

      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, pin.length > i && styles.dotFilled]}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.pad}>
        {KEYS.map((key, index) => (
          <Pressable
            key={`${key}-${index}`}
            style={({ pressed }) => [
              styles.key,
              key === '' && styles.keyEmpty,
              pressed && key !== '' && styles.keyPressed,
            ]}
            disabled={key === ''}
            onPress={() => pressKey(key)}
          >
            {({ pressed }) =>
              key === '⌫' ? (
                <MaterialCommunityIcons
                  name="backspace-outline"
                  size={22}
                  color={pressed ? colors.primary : '#111111'}
                />
              ) : (
                <Text
                  style={[styles.keyText, pressed && styles.keyTextPressed]}
                >
                  {key}
                </Text>
              )
            }
          </Pressable>
        ))}
      </View>
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
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  langBtn: {
    minWidth: 40,
    minHeight: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  langBtnActive: {
    backgroundColor: '#111111',
  },
  langText: {
    color: '#333333',
    fontSize: 13,
    fontWeight: '800',
  },
  langTextActive: {
    color: colors.primary,
  },
  hero: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
    gap: 4,
  },
  logo: {
    width: 112,
    height: 112,
  },
  brand: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '800',
  },
  fieldLabel: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  nicknameInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    color: '#111111',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  nicknameInputError: {
    borderColor: '#C62828',
  },
  hint: {
    color: '#444444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#111111',
  },
  error: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  pad: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  key: {
    width: '28%',
    maxWidth: 100,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  keyPressed: {
    backgroundColor: '#111111',
  },
  keyText: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '800',
  },
  keyTextPressed: {
    color: colors.primary,
  },
});
