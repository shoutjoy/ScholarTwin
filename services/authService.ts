
import { User } from '../types';

const USERS_KEY = 'scholar_users_db_v1';
const SESSION_KEY = 'scholar_session_v1';

// The main admin/owner email
const MAIN_USER_ID = 'shoutjoy1@gmail.com';

// Hardcoded Admin Credentials
const ADMIN_USER: User = {
  id: MAIN_USER_ID,
  password: 'freemath2580!', 
  name: 'Administrator',
  phone: '000-0000-0000',
  isPaid: true,
  isActive: true, 
  isAdmin: true,
  provider: 'local'
};

const initDB = () => {
  const usersJson = localStorage.getItem(USERS_KEY);
  let users: User[] = usersJson ? JSON.parse(usersJson) : [];
  
  // Ensure Admin exists at top or update privileges
  const adminIndex = users.findIndex(u => u.id === MAIN_USER_ID);
  
  if (adminIndex === -1) {
    users.unshift(ADMIN_USER);
  } else {
    // Enforce admin privileges if user exists
    users[adminIndex].isAdmin = true;
    users[adminIndex].isActive = true;
    users[adminIndex].isPaid = true;
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

initDB();

export const authService = {
  getUsers: (): User[] => {
    const json = localStorage.getItem(USERS_KEY);
    return json ? JSON.parse(json) : [];
  },

  // Used for "Import DB" functionality
  saveUsers: (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getPendingUserCount: (): number => {
    const users = authService.getUsers();
    return users.filter(u => !u.isActive).length;
  },

  getCurrentUser: (): User | null => {
    const json = localStorage.getItem(SESSION_KEY);
    return json ? JSON.parse(json) : null;
  },

  login: (emailOrId: string, password: string): { success: boolean; message?: string; user?: User } => {
    const cleanId = emailOrId.trim();
    const cleanPass = password.trim();

    const users = authService.getUsers();
    const user = users.find(u => u.id === cleanId && u.password === cleanPass);

    if (!user) {
      return { success: false, message: 'Invalid ID or Password.' };
    }

    if (!user.isActive) {
      return { success: false, message: '🚫 Account pending approval.' };
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
      isActive: false, 
      isAdmin: false,
      provider: 'local'
    };

    // Auto-approve if it matches main admin email (e.g. self-registration)
    if (newUser.id === MAIN_USER_ID) {
        newUser.isAdmin = true;
        newUser.isActive = true;
        newUser.isPaid = true;
    }

    users.push(newUser);
    authService.saveUsers(users);
    
    if (newUser.isActive) return { success: true, message: 'Account created and auto-approved!' };
    return { success: true, message: 'Account created! Waiting for Admin approval.' };
  },

  /**
   * Updates: Defaults to shoutjoy1@gmail.com and auto-approves.
   */
  mockGoogleLogin: (inputEmail?: string): { success: boolean; user?: User; message?: string } => {
    let targetEmail = inputEmail?.trim();
    
    // Default to shoutjoy1 if empty or specifically requested
    if (!targetEmail || targetEmail === 'shoutjoy1' || targetEmail === 'google_guest') {
        targetEmail = MAIN_USER_ID;
    }
    
    const googleId = targetEmail;
    const googleName = targetEmail.split('@')[0]; 
    
    const users = authService.getUsers();
    let existingUser = users.find(u => u.id === googleId);

    if (!existingUser) {
        // Create new Google user
        const isMainUser = googleId === MAIN_USER_ID;
        const newUser: User = {
            id: googleId,
            name: googleName,
            isPaid: isMainUser, // Auto-paid if main user
            isActive: isMainUser, // Auto-active if main user
            isAdmin: isMainUser, // Auto-admin if main user
            provider: 'google',
            phone: 'N/A'
        };
        users.push(newUser);
        authService.saveUsers(users);
        existingUser = newUser;
    }

    // Force privileges for main user every time they log in (self-healing)
    if (existingUser.id === MAIN_USER_ID) {
         existingUser.isAdmin = true;
         existingUser.isPaid = true;
         existingUser.isActive = true;
         authService.saveUsers(users);
    }

    if (!existingUser.isActive) {
        return { success: false, message: `🚫 Google Account (${googleId}) pending approval.` };
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(existingUser));
    return { success: true, user: existingUser };
  },

  toggleUserStatus: (targetUserId: string, field: 'isActive' | 'isPaid') => {
    const users = authService.getUsers();
    const idx = users.findIndex(u => u.id === targetUserId);
    
    if (idx >= 0) {
        // Prevent disabling the main admin
        if (users[idx].id === MAIN_USER_ID && field === 'isActive') return false;
        
        users[idx][field] = !users[idx][field];
        authService.saveUsers(users);
        return true;
    }
    return false;
  },

  addUser: (userData: { id: string; password?: string; name: string; phone: string; isPaid: boolean; isActive: boolean; provider: 'local' | 'google' }): { success: boolean; message?: string } => {
    const users = authService.getUsers();
    if (users.find(u => u.id === userData.id)) {
        return { success: false, message: 'User ID already exists.' };
    }
    
    const newUser: User = { ...userData, isAdmin: userData.id === MAIN_USER_ID };
    users.push(newUser);
    authService.saveUsers(users);
    return { success: true };
  },

  updateUser: (originalId: string, updatedUser: User): { success: boolean; message?: string } => {
    const users = authService.getUsers();
    const idx = users.findIndex(u => u.id === originalId);
    
    if (idx === -1) return { success: false, message: "User not found." };
    
    // Check ID conflict
    if (originalId !== updatedUser.id) {
        if (users.find(u => u.id === updatedUser.id)) {
            return { success: false, message: "New User ID already exists." };
        }
    }

    // Protect Main Admin ID
    if (originalId === MAIN_USER_ID && updatedUser.id !== MAIN_USER_ID) {
         return { success: false, message: "Cannot change Root Admin ID." };
    }

    users[idx] = { ...users[idx], ...updatedUser };
    
    // Enforce Main Admin rights
    if (users[idx].id === MAIN_USER_ID) {
        users[idx].isAdmin = true;
        users[idx].isActive = true;
    }
    
    authService.saveUsers(users);
    return { success: true };
  },
  
  // --- Backup Functions ---
  exportDatabase: () => {
      const users = authService.getUsers();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "scholar_users_backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  }
};
