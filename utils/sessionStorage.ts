import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGGED_IN_KEY = 'zoe.loggedIn';
const STAFF_ID_KEY = 'zoe.staffId';
const NICKNAME_KEY = 'zoe.nickname';
const ROLE_KEY = 'zoe.staffRole';
const PIN_KEY = 'zoe.pin';

/** App / banking-style PIN length (matches modern phone unlock defaults). */
export const PIN_LENGTH = 6;

export const STAFF_ROLES = ['Waiter', 'Cashier', 'Kitchen', 'Admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

/**
 * Founder admin — tintin. Cashier / Kitchen / Admin require this PIN to unlock.
 */
export const FOUNDER_ADMIN = {
  staffId: 'tintin',
  pin: '597200',
  label: 'Founder admin',
} as const;

export function isFounderStaffId(staffId: string): boolean {
  return staffId.trim().toLowerCase() === FOUNDER_ADMIN.staffId;
}

/** Roles that need Founder admin PIN (not Waiter, not the founder themselves). */
export function roleNeedsFounderPin(role: StaffRole): boolean {
  return role === 'Cashier' || role === 'Kitchen' || role === 'Admin';
}

/** Seeded staff account stored in local DB (AsyncStorage). */
export const STAFF_ACCOUNT = {
  staffId: FOUNDER_ADMIN.staffId,
  nickname: '',
  role: 'Admin' as StaffRole,
  pin: FOUNDER_ADMIN.pin,
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

export async function loadStaffId(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(STAFF_ID_KEY)) ?? '';
  } catch {
    return '';
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
  return pin.length === PIN_LENGTH;
}

export async function saveStaffId(staffId: string): Promise<void> {
  try {
    const trimmed = staffId.trim();
    if (trimmed) {
      await AsyncStorage.setItem(STAFF_ID_KEY, trimmed);
    }
  } catch {
    // Best-effort.
  }
}

export async function saveNickname(nickname: string): Promise<void> {
  try {
    const trimmed = nickname.trim();
    if (trimmed) {
      await AsyncStorage.setItem(NICKNAME_KEY, trimmed);
    }
  } catch {
    // Best-effort.
  }
}

export async function saveStaffRole(role: StaffRole): Promise<void> {
  try {
    await AsyncStorage.setItem(ROLE_KEY, role);
  } catch {
    // Best-effort.
  }
}

export async function loadStaffRole(): Promise<StaffRole | ''> {
  try {
    const value = (await AsyncStorage.getItem(ROLE_KEY)) ?? '';
    return isStaffRole(value) ? value : '';
  } catch {
    return '';
  }
}

/** Write staff id + PIN into local storage (the app "database"). */
export async function saveStaffAccount(
  staffId: string,
  pin: string,
): Promise<void> {
  try {
    const trimmed = staffId.trim();
    if (trimmed) {
      await AsyncStorage.setItem(STAFF_ID_KEY, trimmed);
    }
    if (pin.length === PIN_LENGTH) {
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
    if (existing != null && existing.length === PIN_LENGTH) {
      // Migrate legacy installs: nickname used to be the login id.
      const staffId = await AsyncStorage.getItem(STAFF_ID_KEY);
      if (!staffId) {
        const legacyName = await AsyncStorage.getItem(NICKNAME_KEY);
        if (legacyName) {
          await AsyncStorage.setItem(STAFF_ID_KEY, legacyName);
        }
      }
      return;
    }
  } catch {
    // Fall through and try to seed.
  }
  await saveStaffAccount(STAFF_ACCOUNT.staffId, STAFF_ACCOUNT.pin);
  if (STAFF_ACCOUNT.nickname) {
    await saveNickname(STAFF_ACCOUNT.nickname);
  }
}

/** One round-trip for startup: loggedIn + staffId + nickname + role + PIN. */
export async function loadSessionBundle(): Promise<{
  loggedIn: boolean;
  staffId: string;
  nickname: string;
  role: StaffRole | '';
  pin: string;
}> {
  try {
    const pairs = await AsyncStorage.multiGet([
      LOGGED_IN_KEY,
      STAFF_ID_KEY,
      NICKNAME_KEY,
      ROLE_KEY,
      PIN_KEY,
    ]);
    const map = Object.fromEntries(pairs);
    let staffId = map[STAFF_ID_KEY] ?? '';
    const nickname = map[NICKNAME_KEY] ?? '';
    const roleRaw = map[ROLE_KEY] ?? '';
    const role: StaffRole | '' = isStaffRole(roleRaw) ? roleRaw : '';
    // Legacy: old builds stored login id in nickname only.
    if (!staffId && nickname) {
      staffId = nickname;
      try {
        await AsyncStorage.setItem(STAFF_ID_KEY, staffId);
      } catch {
        // ignore
      }
    }
    return {
      loggedIn: map[LOGGED_IN_KEY] === '1',
      staffId,
      nickname,
      role,
      pin: map[PIN_KEY] ?? '',
    };
  } catch {
    return { loggedIn: false, staffId: '', nickname: '', role: '', pin: '' };
  }
}

export async function saveSession(
  loggedIn: boolean,
  staffId = '',
  pin = '',
): Promise<void> {
  try {
    if (loggedIn) {
      await AsyncStorage.setItem(LOGGED_IN_KEY, '1');
      const trimmed = staffId.trim();
      if (trimmed) {
        await AsyncStorage.setItem(STAFF_ID_KEY, trimmed);
      }
      if (pin.length === PIN_LENGTH) {
        await AsyncStorage.setItem(PIN_KEY, pin);
      }
    } else {
      // Logout keeps staff id + nickname + PIN so next time is login, not re-register.
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
