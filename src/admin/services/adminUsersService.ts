
import { AdminUser, AdminUserStatus, AdminRole } from '../types/admin';
import { MOCK_ADMIN_USERS } from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class AdminUsersService {
  private users = [...MOCK_ADMIN_USERS];

  async listUsers(query?: string): Promise<AdminUser[]> {
    await delay(300); // Snappy
    if (!query) return this.users;
    const q = query.toLowerCase();
    return this.users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  async getUserDetails(id: string): Promise<AdminUser | undefined> {
    await delay(200);
    return this.users.find(u => u.id === id);
  }

  async getStats(): Promise<{ total: number; active: number; newToday: number; admins: number; bookmarks: number }> {
    await delay(200);
    const now = new Date();
    const todayStr = now.toDateString();
    
    // Simulate bookmarks count (randomized based on user count for mock realism)
    const simulatedBookmarks = this.users.length * 12 + 45;

    return {
      total: this.users.length,
      active: this.users.filter(u => u.status === 'active').length,
      newToday: this.users.filter(u => new Date(u.joinedAt).toDateString() === todayStr).length,
      admins: this.users.filter(u => u.role === 'admin').length,
      bookmarks: simulatedBookmarks
    };
  }

  async updateUserStatus(id: string, status: AdminUserStatus): Promise<void> {
    await delay(300);
    this.users = this.users.map(u => u.id === id ? { ...u, status } : u);
  }

  async updateUserRole(id: string, role: AdminRole): Promise<void> {
    await delay(300);
    this.users = this.users.map(u => u.id === id ? { ...u, role } : u);
  }

  async deleteUser(id: string): Promise<void> {
    await delay(500);
    this.users = this.users.filter(u => u.id !== id);
  }
}

export const adminUsersService = new AdminUsersService();
