import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from './UiText';
import { colors } from '../utils/colors';

type Props = {
  visible: boolean;
  title: string;
  detail: string;
  okLabel: string;
  onClose: () => void;
};

/** Cute success popup after an order is placed. */
export function SuccessPopup({
  visible,
  title,
  detail,
  okLabel,
  onClose,
}: Props) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    scale.setValue(0.7);
    opacity.setValue(0);
    bounce.setValue(0);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, {
            toValue: -6,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounce, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [visible, scale, opacity, bounce]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={styles.iconsRow}>
            <MaterialCommunityIcons
              name="noodles"
              size={22}
              color={colors.primary}
            />
            <MaterialCommunityIcons
              name="coffee"
              size={20}
              color={colors.primary}
            />
            <MaterialCommunityIcons
              name="food-apple"
              size={22}
              color={colors.primary}
            />
          </View>

          <Animated.View
            style={[
              styles.iconCircle,
              { transform: [{ translateY: bounce }] },
            ]}
          >
            <MaterialCommunityIcons
              name="check-decagram"
              size={56}
              color="#111111"
            />
          </Animated.View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.detail}>{detail}</Text>



          <Pressable style={styles.okButton} onPress={onClose}>
            <Text style={styles.okText}>{okLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
  },
  iconsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  detail: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
  },
  okButton: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '800',
  },
});
