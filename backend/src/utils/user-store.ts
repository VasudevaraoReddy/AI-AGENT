import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password: string; // In a real app, this should be hashed
  userId: string;
  createdAt: string;
  lastLogin?: string;
}

interface UserStore {
  users: { [key: string]: User };
}

export class UserStoreManager {
  private static instance: UserStoreManager;
  private readonly storePath: string;
  private store: UserStore;

  private constructor() {
    this.storePath = path.join(process.cwd(), 'data', 'user.json');
    this.initializeStore();
  }

  public static getInstance(): UserStoreManager {
    if (!UserStoreManager.instance) {
      UserStoreManager.instance = new UserStoreManager();
    }
    return UserStoreManager.instance;
  }

  private initializeStore() {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Create or load user.json
      if (!fs.existsSync(this.storePath)) {
        this.store = { users: {} };
        this.saveStore();
      } else {
        const data = fs.readFileSync(this.storePath, 'utf-8');
        this.store = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error initializing user store:', error);
      this.store = { users: {} };
    }
  }

  private saveStore() {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2));
    } catch (error) {
      console.error('Error saving user store:', error);
      throw new Error('Failed to save user data');
    }
  }

  public createUser(email: string, password: string): User {
    const existingUser = this.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const user: User = {
      id: uuidv4(),
      email,
      password, // In a real app, this should be hashed
      userId: `user-${uuidv4()}`,
      createdAt: new Date().toISOString()
    };

    this.store.users[user.id] = user;
    this.saveStore();
    return user;
  }

  public findByEmail(email: string): User | null {
    return Object.values(this.store.users).find(user => user.email === email) || null;
  }

  public findById(id: string): User | null {
    return this.store.users[id] || null;
  }

  public validateUser(email: string, password: string): User | null {
    const user = this.findByEmail(email);
    if (user && user.password === password) { // In a real app, compare hashed passwords
      // Update last login
      user.lastLogin = new Date().toISOString();
      this.saveStore();
      return user;
    }
    return null;
  }

  public updateUser(id: string, updates: Partial<User>): User {
    const user = this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = { ...user, ...updates };
    this.store.users[id] = updatedUser;
    this.saveStore();
    return updatedUser;
  }

  public deleteUser(id: string): void {
    if (!this.store.users[id]) {
      throw new Error('User not found');
    }

    delete this.store.users[id];
    this.saveStore();
  }

  public getAllUsers(): User[] {
    return Object.values(this.store.users);
  }
} 