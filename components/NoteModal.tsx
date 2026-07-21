import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { Text, TextInput } from './UiText';
import { colors } from '../utils/colors';

type Props = {
  visible: boolean;
  lang: 'en' | 'th';
  itemName: string;
  initialNote?: string;
  onSubmit: (note: string) => void;
  onClose: () => void;
};

const COPY = {
  en: {
    title: 'Add notes',
    hint: 'Special request for this item',
    placeholder: 'e.g. no spicy, extra sauce',
    save: 'Save',
    clear: 'Clear',
    cancel: 'Cancel',
  },
  th: {
    title: 'เพิ่มโน้ต',
    hint: 'หมายเหตุพิเศษสำหรับรายการนี้',
    placeholder: 'เช่น ไม่เผ็ด, ซอสเพิ่ม',
    save: 'บันทึก',
    clear: 'ล้าง',
    cancel: 'ยกเลิก',
  },
};

export function NoteModal({
  visible,
  lang,
  itemName,
  initialNote = '',
  onSubmit,
  onClose,
}: Props) {
  const t = COPY[lang];
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (visible) setNote(initialNote);
  }, [visible, initialNote]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.itemName} numberOfLines={2}>
            {itemName}
          </Text>
          <Text style={styles.hint}>{t.hint}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t.placeholder}
            placeholderTextColor="#888"
            autoFocus
            autoCorrect={false}
            multiline
            returnKeyType="done"
            style={styles.input}
          />
          <Pressable style={styles.saveBtn} onPress={() => onSubmit(note.trim())}>
            <Text style={styles.saveText}>{t.save}</Text>
          </Pressable>
          {initialNote.trim() ? (
            <Pressable style={styles.clear} onPress={() => onSubmit('')}>
              <Text style={styles.clearText}>{t.clear}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>{t.cancel}</Text>
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
  itemName: {
    color: '#333333',
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111111',
    fontSize: 16,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
  saveBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  clear: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  clearText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '700',
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
