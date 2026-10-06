import { create } from 'zustand';
import { decodeSession, type SessionUser } from './jwt';

/** Una cuenta con la que se ingreso en este navegador. */
export interface Account {
  token: string;
  user: SessionUser;
}

interface AuthState {
  /** Cuenta activa de ESTA pestaña (o null: pantalla de ingreso). */
  token: string | null;
  user: SessionUser | null;
  /** Todas las cuentas guardadas en el navegador (vendedor, admin, ...). */
  accounts: Account[];
  /** Ingresa (o renueva) una cuenta y la deja activa en esta pestaña. */
  signIn: (token: string) => void;
  /** Cambia la cuenta de esta pestaña, sin tocar las demas pestañas. */
  switchAccount: (userId: string) => void;
  /** Cierra solo la cuenta activa; las otras siguen guardadas. */
  signOut: () => void;
}

/*
 * Varias sesiones en el mismo navegador sin pisarse:
 *  - localStorage "latk-accounts": las cuentas (compartidas por todas las pestañas);
 *  - sessionStorage "latk-active": la cuenta de cada pestaña (sobrevive a recargar);
 *  - localStorage "latk-last:app|web": con que cuenta abre una pestaña nueva, separado para la app
 *    instalada y el navegador (asi la app del vendedor no abre como admin).
 * Si otra pestaña ingresa con otro usuario, esta pestaña conserva el suyo.
 */
const ACCOUNTS_KEY = 'latk-accounts';
const ACTIVE_KEY = 'latk-active';
const LEGACY_KEY = 'latk-session';

const lastKey = () => {
  const standalone =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(display-mode: standalone)').matches === true;
  return `latk-last:${standalone ? 'app' : 'web'}`;
};

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // sin almacenamiento (modo privado estricto): la sesion vive solo en memoria
  }
}

const local = () => localStorage;
const session = () => sessionStorage;

const valid = (a: Account) => a.user.expiresAt > Date.now();

function loadAccounts(): Account[] {
  try {
    const raw = read(local, ACCOUNTS_KEY);
    const accounts = raw ? (JSON.parse(raw) as Account[]) : [];
    // Version anterior: una sola sesion en "latk-session". Se migra una vez.
    const legacy = read(local, LEGACY_KEY);
    if (legacy) {
      const token = (JSON.parse(legacy) as { state?: { token?: string } }).state?.token;
      if (token && !accounts.some((a) => a.token === token)) {
        accounts.push({ token, user: decodeSession(token) });
      }
      write(local, LEGACY_KEY, null);
    }
    return accounts.filter(valid);
  } catch {
    return [];
  }
}

function saveAccounts(accounts: Account[]) {
  write(local, ACCOUNTS_KEY, JSON.stringify(accounts));
}

/** Cuenta inicial de la pestaña: la que ya tenia, o la ultima usada en la app o el navegador. */
function initialActive(accounts: Account[]): Account | null {
  const find = (id: string | null) => accounts.find((a) => a.user.userId === id) ?? null;
  return find(read(session, ACTIVE_KEY)) ?? find(read(local, lastKey()));
}

function activate(account: Account | null) {
  write(session, ACTIVE_KEY, account?.user.userId ?? null);
  if (account) write(local, lastKey(), account.user.userId);
}

const startAccounts = loadAccounts();
const startActive = initialActive(startAccounts);
saveAccounts(startAccounts);
write(session, ACTIVE_KEY, startActive?.user.userId ?? null);

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: startActive?.token ?? null,
  user: startActive?.user ?? null,
  accounts: startAccounts,

  signIn: (token) => {
    const account = { token, user: decodeSession(token) };
    const accounts = [
      ...loadAccounts().filter((a) => a.user.userId !== account.user.userId),
      account,
    ];
    saveAccounts(accounts);
    activate(account);
    set({ token, user: account.user, accounts });
  },

  switchAccount: (userId) => {
    const account = get().accounts.find((a) => a.user.userId === userId && valid(a));
    if (!account) return;
    activate(account);
    set({ token: account.token, user: account.user });
  },

  signOut: () => {
    const current = get().user?.userId;
    const accounts = loadAccounts().filter((a) => a.user.userId !== current);
    saveAccounts(accounts);
    activate(null);
    set({ token: null, user: null, accounts });
  },
}));

// Otra pestaña ingreso o cerro una cuenta: se actualiza la lista, pero ESTA pestaña sigue con su
// cuenta. Solo si su cuenta se cerro en otra pestaña, vuelve al ingreso (nunca toma otra cuenta).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== ACCOUNTS_KEY) return;
    const accounts = loadAccounts();
    const current = useAuthStore.getState().user?.userId;
    const mine = accounts.find((a) => a.user.userId === current);
    useAuthStore.setState(
      mine
        ? { accounts, token: mine.token, user: mine.user }
        : current
          ? { accounts, token: null, user: null }
          : { accounts },
    );
  });
}

export const getToken = () => {
  const { token, user } = useAuthStore.getState();
  return token && user && user.expiresAt > Date.now() ? token : null;
};

/** Las otras cuentas guardadas (para cambiar de cuenta), sin las vencidas. */
export const otherAccounts = (state: Pick<AuthState, 'accounts' | 'user'>) =>
  state.accounts.filter((a) => a.user.userId !== state.user?.userId && valid(a));
