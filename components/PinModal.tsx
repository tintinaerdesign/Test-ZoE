import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/colors';
import { PIN_LENGTH } from '../utils/sessionStorage';

type Props = {
  visible: boolean;
  lang: 'en' | 'th';
  /** Cashier / staff PIN from local account DB. */
  expectedPin: string;
  title?: string;
  hint?: string;
  onSubmit: (pin: string) => void;
  onClose: () => void;
};

const COPY = {
  en: {
    title: 'Cashier PIN',
    hint: 'Enter 6-digit PIN to confirm cash payment',
    wrong: 'Incorrect PIN',
    cancel: 'Cancel',
  },
  th: {
    title: 'รหัสแคชเชียร์',
    hint: 'กรอกรหัส 6 หลัก เพื่อยืนยันชำระเงินสด',
    wrong: 'รหัสไม่ถูกต้อง',
    cancel: 'ยกเลิก',
  },
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;
const PIN_DOTS = Array.from({ length: PIN_LENGTH }, (_, i) => i);

export function PinModal({
  visible,
  lang,
  expectedPin,
  title,
  hint,
  onSubmit,
  onClose,
}: Props) {
  const t = COPY[lang];
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const expectedRef = useRef(expectedPin);
  const onSubmitRef = useRef(onSubmit);
  expectedRef.current = expectedPin;
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (!visible) return;
    setPin('');
    setWrong(false);
  }, [visible]);

  useEffect(() => {
    if (!visible || pin.length !== PIN_LENGTH) return;
    const entered = pin;
    const timer = setTimeout(() => {
      if (entered === expectedRef.current) {
        onSubmitRef.current(entered);
      } else {
        setWrong(true);
        setPin('');
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [pin, visible]);

  function pressKey(key: string) {
    if (key === '') return;
    setWrong(false);
    if (key === '⌫') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + key));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* View (not Pressable) backdrop — avoids the open-button touch dismissing the modal. */}
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title ?? t.title}</Text>
          <Text style={styles.hint}>{hint ?? t.hint}</Text>

          <View style={styles.dots}>
            {PIN_DOTS.map((i) => (
              <View
                key={i}
                style={[styles.dot, pin.length > i && styles.dotFilled]}
              />
            ))}
          </View>

          {wrong ? <Text style={styles.wrong}>{t.wrong}</Text> : null}

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
                <Text style={styles.keyText}>{key}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>{t.cancel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  title: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
    alignSelf: 'stretch',
  },
  hint: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '600',
    alignSelf: 'stretch',
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#111111',
  },
  wrong: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '700',
  },
  pad: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  key: {
    width: '30%',
    maxWidth: 96,
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
    backgroundColor: colors.primary,
  },
  keyText: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '800',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '600',
  },
});
