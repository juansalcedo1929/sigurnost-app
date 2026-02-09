// src/lib/auth.ts
import { supabase } from './supabase';
import { User } from '../types';

export class AuthService {
  static async login(username: string, password: string): Promise<User | null> {
    try {
      // SOLUCIÓN: Convertir ambos a minúsculas para comparación consistente
      const normalizedUsername = username.toLowerCase().trim();
      
      const { data: users, error } = await supabase
        .from('users')
        .select(`
          *,
          employee:employees(*)
        `)
        .eq('username', normalizedUsername) // Usar el username normalizado
        .eq('password', password);

      if (error) {
        console.error('Error en login:', error);
        return null;
      }

      if (!users || users.length === 0) {
        return null;
      }

      const user = users[0];
      
      // Guardar en localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
      return user;
    } catch (error) {
      console.error('Error en login:', error);
      return null;
    }
  }
static async getEmployeeUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        employee:employees(*)
      `)
      .eq('role', 'employee')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo empleados:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    return [];
  }
}
  static async logout(): Promise<void> {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  }

  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('isAuthenticated') === 'true';
  }

  static isAdmin(user: User | null): boolean {
    return user?.role === 'admin';
  }

  // Crear nuevo usuario (solo admin)
  static async createUser(userData: {
    username: string;
    password: string;
    role: 'admin' | 'employee';
    employee_id?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // SOLUCIÓN: Normalizar username a minúsculas al crear
      const normalizedUsername = userData.username.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: normalizedUsername, // Guardar en minúsculas
          password: userData.password,
          role: userData.role,
          employee_id: userData.employee_id
        }])
        .select()
        .single();

      if (error) {
        return { success: false, error: 'Error al crear usuario' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al crear usuario' };
    }
  }

  static async checkUsernameExists(username: string): Promise<boolean> {
    try {
      // SOLUCIÓN: Normalizar para la verificación
      const normalizedUsername = username.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', normalizedUsername)
        .single();

      return !!data;
    } catch (error) {
      return false;
    }
  }

  // Obtener todos los usuarios (solo admin)
  static async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        employee:employees(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return data || [];
  }

  // Eliminar usuario (solo admin)
  static async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        return { success: false, error: 'Error al eliminar usuario' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al eliminar usuario' };
    }
  }
}