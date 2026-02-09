// src/lib/employee.ts
import { supabase } from './supabase';
import { Employee } from '../types';

export class EmployeeService {
  /**
   * Obtener todos los empleados
   */
  static async getAllEmployees(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

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

  /**
   * Crear un nuevo empleado
   */
  static async createEmployee(employeeData: {
    name: string;
    email?: string;
    salary?: number;
  }): Promise<{ success: boolean; data?: Employee; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          name: employeeData.name,
          email: employeeData.email || null,
          salary: employeeData.salary || 0
        }])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Actualizar un empleado existente
   */
  static async updateEmployee(
    employeeId: string,
    updateData: Partial<Employee>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', employeeId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar un empleado
   */
  static async deleteEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener estadísticas de empleados
   */
  static async getEmployeeStats() {
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*');

      if (error) {
        return { total: 0, averageSalary: 0 };
      }

      const total = employees?.length || 0;
      const totalSalary = employees?.reduce((sum, emp) => sum + (emp.salary || 0), 0) || 0;
      const averageSalary = total > 0 ? totalSalary / total : 0;

      return {
        total,
        averageSalary,
        totalSalary
      };
    } catch (error) {
      return { total: 0, averageSalary: 0 };
    }
  }
}