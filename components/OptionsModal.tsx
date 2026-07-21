import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from './UiText';
import { isOptionAvailable } from '../data/ingredients';
import type { MenuItem, MenuOption } from '../data/menu';
import { colors } from '../utils/colors';
import { formatBaht } from '../utils/format';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const OPTION_ICONS: Record<string, IconName> = {
  pork: 'pig-variant',
  'minced-pork': 'pig-variant',
  'pork-slice': 'pig-variant',
  'moo-yor': 'food-steak',
  'minced-pork-moo-yor': 'pig-variant',
  chicken: 'food-drumstick',
  egg: 'egg-outline',
  carbonara: 'pasta',
  'spicy spaghetti': 'chili-hot',
};

type Props = {
  item: MenuItem | null;
  title: string;
  subtitle: string;
  cancelLabel: string;
  soldOutLabel?: string;
  /** Ingredient names toggled off in NoIngredient. */
  unavailableIngredients?: string[];
  optionLabel: (option: MenuOption) => string;
  onSelect: (optionId: string) => void;
  onClose: () => void;
};

/** Modal to pick an ingredient/variant when a menu item has options. */
export function OptionsModal({
  item,
  title,
  subtitle,
  cancelLabel,
  soldOutLabel = 'หมด',
  unavailableIngredients = [],
  optionLabel,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal
      visible={item != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {item?.options?.map((option) => {
            const icon = OPTION_ICONS[option.id] ?? 'food';
            const available = isOptionAvailable(option, unavailableIngredients);
            // Recommended minced pork (กะเพรา / ยำวุ้นเส้น) — pink accent + ★
            const mincedPorkHighlight =
              option.id === 'minced-pork' && option.recommended === true;
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.option,
                  mincedPorkHighlight && styles.optionMincedPork,
                  !available && styles.optionSoldOut,
                ]}
                disabled={!available}
                onPress={() => {
                  if (available) onSelect(option.id);
                }}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.iconWrap,
                      mincedPorkHighlight && styles.iconWrapMincedPork,
                      !available && styles.iconWrapSoldOut,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={icon}
                      size={26}
                      color={available ? '#111111' : '#888888'}
                    />
                  </View>
                  <View style={styles.optionLabelRow}>
                    <Text
                      style={[
                        styles.optionText,
                        !available && styles.optionTextSoldOut,
                      ]}
                    >
                      {optionLabel(option)}
                    </Text>
                    {option.recommended ? (
                      <MaterialCommunityIcons
                        name="star"
                        size={18}
                        color={available ? '#F5A623' : '#AAAAAA'}
                      />
                    ) : null}
                  </View>
                </View>
                <Text
                  style={[
                    styles.optionPrice,
                    !available && styles.optionTextSoldOut,
                  ]}
                >
                  {available ? formatBaht(item.price) : soldOutLabel}
                </Text>
              </Pressable>
            );
          })}

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
    gap: 10,
  },
  title: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#111111',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  /** Basil minced pork — pink meat accent, only for กะเพรา. */
  optionMincedPork: {
    backgroundColor: '#FFD6DE',
    borderColor: '#E85A7A',
  },
  optionSoldOut: {
    opacity: 0.55,
    borderColor: '#999999',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapMincedPork: {
    backgroundColor: '#FF8FA3',
  },
  iconWrapSoldOut: {
    backgroundColor: '#DDDDDD',
  },
  optionText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  optionTextSoldOut: {
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  optionPrice: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '600',
  },
});
