
import { User } from '../types';

const USERS_KEY = 'scholar_users_db_v1';
const SESSION_KEY = 'scholar_session_v1';

// Hardcoded Admin Credentials
const ADMIN_USER: User = {
  id: 'shoutjoy1@gmail.com',
  password: 'freemath2680!',
  name: 'Administrator',
  phone: '000-0000-0000',
  isPaid: true,
  isActive: true,
  isAdmin: true,
  provider: 'local'
};

// Initialize DB with Admin if empty
const initDB = () => {
  const usersJson = localStorage.getItem(USERS_KEY);
  let users: User[] = usersJson ? JSON.parse(usersJson) : [];
  
  // Ensure admin always exists and details are correct
  const adminIndex = users.findIndex(u => u.id === ADMIN_USER.id || u.id === 'shoutjoy1');
  if (adminIndex >= 0) {
    users[adminIndex] = { ...users[adminIndex], ...ADMIN_USER, password: ADMIN_USER.password }; // Force update admin creds
  } else {
    users.push(ADMIN_USER);
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

initDB();

export const authService = {
  getUsers: (): User[] => {
    const json = localStorage.getItem(USERS_KEY);
    return json ? JSON.parse(json) : [];
  },

  saveUsers: (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getCurrentUser: (): User | null => {
    const json = localStorage.getItem(SESSION_KEY);
    return json ? JSON.parse(json) : null;
  },

  login: (emailOrId: string, password: string): { success: boolean; message?: string; user?: User } => {
    const users = authService.getUsers();
    // Allow login with 'shoutjoy1' or email
    const user = users.find(u => (u.id === emailOrId || u.id.split('@')[0] === emailOrId) && u.password === password);

    if (!user) {
      return { success: false, message: 'Invalid ID or Password.' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Account is deactivated. Please contact admin.' };
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, user };
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  signup: (data: { email: string; password: string; name: string; phone: string; isPaidRequest?: boolean }): { success: boolean; message?: string } => {
    const users = authService.getUsers();
    if (users.find(u => u.id === data.email)) {
      return { success: false, message: 'User already exists.' };
    }

    const newUser: User = {
      id: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      isPaid: data.isPaidRequest || false,
      isActive: true, // Default active? Or false pending approval? Let's default true for UX.
      isAdmin: false,
      provider: 'local'
    };

    users.push(newUser);
    authService.saveUsers(users);
    
    // Auto login after signup
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    return { success: true };
  },

  mockGoogleLogin: (): { success: boolean; user?: User } => {
    // Simulate Google Sign In
    const mockEmail = `google_user_${Math.floor(Math.random() * 1000)}@gmail.com`;
    const users = authService.getUsers();
    let user = users.find(u => u.id === mockEmail);

    if (!user) {
      user = {
        id: mockEmail,
        name: 'Google User',
        isPaid: false,
        isActive: true,
        isAdmin: false,
        provider: 'google',
        phone: ''
      };
      users.push(user);
      authService.saveUsers(users);
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, user };
  },

  // Admin Functions
  toggleUserStatus: (targetUserId: string, field: 'isActive' | 'isPaid') => {
    const users = authService.getUsers();
    const idx = users.findIndex(u => u.id === targetUserId);
    if (idx >= 0 && users[idx].id !== ADMIN_USER.id) { // Cannot modify root admin
      users[idx][field] = !users[idx][field];
      authService.saveUsers(users);
      return true;
    }
    return false;
  }
};
