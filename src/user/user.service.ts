import { Injectable } from '@nestjs/common';
import { UserStoreManager, User } from '../utils/user-store';

@Injectable()
export class UserService {
  private readonly userStore: UserStoreManager;

  constructor() {
    this.userStore = UserStoreManager.getInstance();
  }

  async createUser(email: string, password: string): Promise<User> {
    return this.userStore.createUser(email, password);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userStore.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.userStore.findById(id);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    return this.userStore.validateUser(email, password);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    return this.userStore.updateUser(id, updates);
  }

  async deleteUser(id: string): Promise<void> {
    return this.userStore.deleteUser(id);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userStore.getAllUsers();
  }
} 