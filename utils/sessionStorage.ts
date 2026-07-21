import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGGED_IN_KEY = 'zoe.loggedIn';
const NICKNAME_KEY = 'zoe.nickname';
const PIN_KEY = 'zoe.pin';

/** Seeded staff account stored in local DB (AsyncStorage). */
export const STAFF_ACCOUNT = {
  nickname: 'tintin',
  pin: '5972',
} as const;

/** Persist staff session across app restarts (like LINE stay logged in). */
export async function loadLoggedIn(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(LOGGED_IN_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function loadNickname(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(NICKNAME_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function loadPin(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(PIN_KEY)) ?? '';
  } catch {
    return '';
  }
}

/** True after first-time registration (PIN was set). */
export async function hasRegisteredAccount(): Promise<boolean> {
  const pin = await loadPin();
  return pin.length === 4;
}

/** Write nickname + PIN into local storage (the app "database"). */
export async function saveStaffAccount(
  nickname: string,
  pin: string,
): Promise<void> {
  try {
    const trimmed = nickname.trim();
    if (trimmed) {
      await AsyncStorage.setItem(NICKNAME_KEY, trimmed);
    }
    if (pin.length === 4) {
      await AsyncStorage.setItem(PIN_KEY, pin);
    }
  } catch {
    // Ignore storage failures — session is best-effort.
  }
}

/** Ensure the known staff account exists — write only on first install (skip if PIN present). */
export async function ensureStaffAccount(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(PIN_KEY);
    if (existing != null && existing.length === 4) return;
  } catch {
    // Fall through and try to seed.
  }
  await saveStaffAccount(STAFF_ACCOUNT.nickname, STAFF_ACCOUNT.pin);
}

/** One round-trip for startup: loggedIn + nickname + PIN. */
export async function loadSessionBundle(): Promise<{
  loggedIn: boolean;
  nickname: string;
  pin: string;
}> {
  try {
    const pairs = await AsyncStorage.multiGet([
      LOGGED_IN_KEY,
      NICKNAME_KEY,
      PIN_KEY,
    ]);
    const map = Object.fromEntries(pairs);
    return {
      loggedIn: map[LOGGED_IN_KEY] === '1',
      nickname: map[NICKNAME_KEY] ?? '',
      pin: map[PIN_KEY] ?? '',
    };
  } catch {
    return { loggedIn: false, nickname: '', pin: '' };
  }
}

export async function saveSession(
  loggedIn: boolean,
  nickname = '',
  pin = '',
): Promise<void> {
  try {
    if (loggedIn) {
      await AsyncStorage.setItem(LOGGED_IN_KEY, '1');
      const trimmed = nickname.trim();
      if (trimmed) {
        await AsyncStorage.setItem(NICKNAME_KEY, trimmed);
      }
      if (pin.length === 4) {
        await AsyncStorage.setItem(PIN_KEY, pin);
      }
    } else {
      // Logout keeps nickname + PIN so next time is login, not re-register.
      await AsyncStorage.removeItem(LOGGED_IN_KEY);
    }
  } catch {
    // Ignore storage failures — session is best-effort.
  }
}

/** @deprecated use saveSession */
export async function saveLoggedIn(loggedIn: boolean): Promise<void> {
  await saveSession(loggedIn);
}
