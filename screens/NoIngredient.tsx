import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../components/UiText';
import { INGREDIENT_SUBSETS } from '../data/ingredients';
import { MENU, type MenuItem } from '../data/menu';
import { colors } from '../utils/colors';

type Props = {
  /** Ingredient names that are out of stock (switch OFF). */
  unavailableIngredients: string[];
  setUnavailableIngredients: (names: string[]) => void;
  /** Menu item ids out of stock (switch OFF) — hidden from waiter menu. */
  unavailableIds: string[];
  setUnavailableIds: (ids: string[]) => void;
  onBack: () => void;
};

type ListRow =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'ingredient'; key: string; name: string }
  | { kind: 'dish'; key: string; item: MenuItem };

/**
 * Kitchen stock board — shared ingredients + every dish (snacks then mains).
 * ON = available · OFF = no stock / hide from menu.
 */
export function NoIngredient({
  unavailableIngredients,
  setUnavailableIngredients,
  unavailableIds,
  setUnavailableIds,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const unavailableIng = useMemo(
    () => new Set(unavailableIngredients),
    [unavailableIngredients],
  );
  const unavailableMenu = useMemo(
    () => new Set(unavailableIds),
    [unavailableIds],
  );

  const rows = useMemo(() => {
    const snacks = MENU.filter((item) => (item.station ?? 'main') === 'snack');
    const mains = MENU.filter((item) => (item.station ?? 'main') === 'main');
    const list: ListRow[] = [
      { kind: 'header', key: 'h-ing', title: 'ส่วนประกอบสำคัญ' },
      ...INGREDIENT_SUBSETS.map(
        (name): ListRow => ({
          kind: 'ingredient',
          key: `ing-${name}`,
          name,
        }),
      ),
      { kind: 'header', key: 'h-snack', title: 'ของทานเล่น' },
      ...snacks.map(
        (item): ListRow => ({
          kind: 'dish',
          key: `dish-${item.id}`,
          item,
        }),
      ),
      { kind: 'header', key: 'h-main', title: 'อาหารจานหลัก' },
      ...mains.map(
        (item): ListRow => ({
          kind: 'dish',
          key: `dish-${item.id}`,
          item,
        }),
      ),
    ];
    return list;
  }, []);

  function setIngredientAvailable(name: string, available: boolean) {
    if (available) {
      setUnavailableIngredients(
        unavailableIngredients.filter((entry) => entry !== name),
      );
    } else if (!unavailableIng.has(name)) {
      setUnavailableIngredients([...unavailableIngredients, name]);
    }
  }

  function setDishAvailable(item: MenuItem, available: boolean) {
    if (available) {
      setUnavailableIds(unavailableIds.filter((id) => id !== item.id));
    } else if (!unavailableMenu.has(item.id)) {
      setUnavailableIds([...unavailableIds, item.id]);
    }
  }

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.backBtnHover,
          ]}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.title}>วัตถุดิบหมด</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row) => {
          if (row.kind === 'header') {
            return (
              <Text key={row.key} style={styles.sectionTitle}>
                {row.title}
              </Text>
            );
          }

          if (row.kind === 'ingredient') {
            const available = !unavailableIng.has(row.name);
            return (
              <View
                key={row.key}
                style={[styles.row, !available && styles.rowOff]}
              >
                <Text
                  style={[styles.name, !available && styles.nameOff]}
                  numberOfLines={1}
                >
                  {row.name}
                </Text>
                <Switch
                  value={available}
                  onValueChange={(on) =>
                    setIngredientAvailable(row.name, on)
                  }
                  trackColor={{ false: '#333333', true: colors.primary }}
                  thumbColor={available ? '#111111' : '#888888'}
                  ios_backgroundColor="#333333"
                />
              </View>
            );
          }

          const { item } = row;
          const available = !unavailableMenu.has(item.id);
          const content = (
            <View style={styles.rowInner}>
              <Text
                style={[styles.name, !available && styles.nameOff]}
                numberOfLines={1}
              >
                {item.nameTh || item.name}
              </Text>
              <Switch
                value={available}
                onValueChange={(on) => setDishAvailable(item, on)}
                trackColor={{ false: '#333333', true: colors.primary }}
                thumbColor={available ? '#111111' : '#888888'}
                ios_backgroundColor="#333333"
              />
            </View>
          );

          if (item.image) {
            return (
              <ImageBackground
                key={row.key}
                source={item.image}
                style={[styles.dishRow, !available && styles.rowOff]}
                imageStyle={styles.dishBgImage}
              >
                <View style={styles.dishOverlay}>{content}</View>
              </ImageBackground>
            );
          }

          return (
            <View
              key={row.key}
              style={[styles.dishRow, styles.dishFallback, !available && styles.rowOff]}
            >
              {content}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHover: {
    backgroundColor: '#2E2E2E',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  list: {
    gap: 8,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222222',
  },
  dishRow: {
    minHeight: 64,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222222',
  },
  dishFallback: {
    backgroundColor: '#141414',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  dishBgImage: {
    opacity: 0.6,
    borderRadius: 12,
  },
  dishOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 64,
  },
  rowOff: {
    opacity: 0.6,
  },
  name: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  nameOff: {
    color: '#9A9A9A',
    textDecorationLine: 'line-through',
  },
});
