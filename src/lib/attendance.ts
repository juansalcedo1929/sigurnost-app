// src/lib/attendance.ts
import { supabase } from './supabase';
import { Attendance } from '../types';

export class AttendanceService {
  // Obtiene fecha pacífico en formato YYYY-MM-DD
  private static getPacificDateString(date: Date = new Date()): string {
    const pacific = new Date(
      date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    );

    const y = pacific.getFullYear();
    const m = String(pacific.getMonth() + 1).padStart(2, '0');
    const d = String(pacific.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

  // Fecha y hora completa (Pacific)
  private static getPacificDateTimeString(date: Date = new Date()): string {
    return new Date(
      date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    ).toISOString();
  }

  // Registrar o actualizar asistencia
  static async markAttendance(
    employeeId: string,
    date: string,
    attended: boolean,
    workDescription?: string | null,
    isDoubleDay: boolean = false,
    justified: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('attendances')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('attendance_date', date)
        .maybeSingle();

      const finalWorkDescription = workDescription || null;

      // Validaciones lógicas
      const finalIsDoubleDay = attended ? isDoubleDay : false;
      const finalJustified = attended ? false : justified;

      if (existing) {
        const { error } = await supabase
          .from('attendances')
          .update({
            attended,
            work_description: finalWorkDescription,
            is_double_day: finalIsDoubleDay,
            justified: finalJustified,
            updated_at: this.getPacificDateTimeString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('attendances')
          .insert({
            employee_id: employeeId,
            attendance_date: date,
            attended,
            work_description: finalWorkDescription,
            hours_worked: 0,
            is_double_day: finalIsDoubleDay,
            justified: finalJustified,
            status: 'pending',
            created_at: this.getPacificDateTimeString(),
            updated_at: this.getPacificDateTimeString(),
          });

        if (error) throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error en markAttendance:', error);
      return {
        success: false,
        error: error.message || 'Error al registrar asistencia',
      };
    }
  }

  // Obtener asistencias del usuario
  static async getMyAttendances(): Promise<Attendance[]> {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return [];

      const user = JSON.parse(userStr);
      if (!user.employee_id) return [];

      const { data, error } = await supabase
        .from('attendances')
        .select(`*, employee:employees(*)`)
        .eq('employee_id', user.employee_id)
        .order('attendance_date', { ascending: false });

      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  }

  // Obtener asistencia de hoy
  static async getTodayAttendance(employeeId: string): Promise<Attendance | null> {
    try {
      const today = this.getPacificDateString();

      const { data } = await supabase
        .from('attendances')
        .select(`*, employee:employees(*)`)
        .eq('employee_id', employeeId)
        .eq('attendance_date', today)
        .maybeSingle();

      return data;
    } catch {
      return null;
    }
  }

  // Admin: obtener todas
  static async getAllAttendances(): Promise<Attendance[]> {
    try {
      const { data, error } = await supabase
        .from('attendances')
        .select(`*, employee:employees(*)`)
        .order('attendance_date', { ascending: false });

      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  }

  static getTodayDate(): string {
    return this.getPacificDateString();
  }

  // Formatear fecha
  static formatPacificDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00-08:00');
    return date.toLocaleDateString('es-ES', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Admin modifica descripción
  static async updateAttendanceDescription(
    attendanceId: string,
    description: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('attendances')
        .update({
          work_description: description,
          updated_at: this.getPacificDateTimeString(),
        })
        .eq('id', attendanceId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Admin cambia estado
  static async updateAttendanceStatus(
    attendanceId: string,
    status: 'approved' | 'rejected'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('attendances')
        .update({
          status,
          updated_at: this.getPacificDateTimeString(),
        })
        .eq('id', attendanceId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateAttendanceText(id: string, work_description: string) {
    const { data, error } = await supabase
      .from('attendances')
      .update({ work_description })
      .eq('id', id);

    if (error) {
      console.error(error);
      return { success: false };
    }

    return { success: true, data };
  }

  static async getPendingAttendances(): Promise<Attendance[]> {
    try {
      const { data } = await supabase
        .from('attendances')
        .select(`*, employee:employees(*)`)
        .eq('status', 'pending')
        .order('attendance_date', { ascending: false });

      return data || [];
    } catch {
      return [];
    }
  }

  static async getAttendancesByStatus(
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<Attendance[]> {
    try {
      const { data } = await supabase
        .from('attendances')
        .select(`*, employee:employees(*)`)
        .eq('status', status)
        .order('attendance_date', { ascending: false });

      return data || [];
    } catch {
      return [];
    }
  }
}