// src/lib/payroll.ts
import { supabase } from './supabase';
import { PayrollReport, PayrollRecord, Attendance, Employee } from '../types';

export class PayrollService {
  /**
   * Genera un reporte de nómina para un período específico
   */
  static async generatePayrollReport(
    startDate: string,
    endDate: string
  ): Promise<PayrollReport> {
    try {
      // Obtener todos los empleados
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (employeesError) throw employeesError;

      // Obtener asistencias aprobadas en el período
      const { data: attendances, error: attendancesError } = await supabase
        .from('attendances')
        .select('*, employee:employees(*)')
        .eq('status', 'approved')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: true });

      if (attendancesError) throw attendancesError;

      // Organizar asistencias por empleado
      const attendanceByEmployee: Record<string, Attendance[]> = {};
      (attendances || []).forEach(attendance => {
        if (!attendanceByEmployee[attendance.employee_id]) {
          attendanceByEmployee[attendance.employee_id] = [];
        }
        attendanceByEmployee[attendance.employee_id].push(attendance);
      });

      // Generar registros de nómina
      const records: PayrollRecord[] = [];
      let totalDaysWorked = 0;
      let totalPayroll = 0;

      employees?.forEach(employee => {
        const employeeAttendances = attendanceByEmployee[employee.id] || [];
        
        // Contar días
        let regularDays = 0;
        let doubleDays = 0;
        let justifiedAbsences = 0;

        employeeAttendances.forEach(attendance => {
          if (attendance.attended) {
            // Si asistió
            if (attendance.is_double_day) {
              doubleDays++;
            } else {
              regularDays++;
            }
          } else if (attendance.justified) {
            // Si no asistió pero está justificado
            justifiedAbsences++;
          }
          // Si no asistió y no está justificado, no se cuenta para nada
        });

        // Calcular días trabajados totales
        // Días dobles cuentan como 2 días para el pago
        const totalDaysWorkedForEmployee = regularDays + (doubleDays * 2);
        
        // Calcular pago total
        const dailySalary = employee.salary || 0;
        const totalPayForEmployee = totalDaysWorkedForEmployee * dailySalary;

        // Acumular totales
        totalDaysWorked += totalDaysWorkedForEmployee;
        totalPayroll += totalPayForEmployee;

        records.push({
          employee_id: employee.id,
          employee_name: employee.name,
          regular_days: regularDays,
          double_days: doubleDays,
          justified_absences: justifiedAbsences,
          total_days_worked: totalDaysWorkedForEmployee,
          daily_salary: dailySalary,
          total_pay: totalPayForEmployee,
          attendances: employeeAttendances
        });
      });

      // Ordenar por nombre de empleado
      records.sort((a, b) => a.employee_name.localeCompare(b.employee_name));

      return {
        period: {
          start_date: startDate,
          end_date: endDate
        },
        total_employees: records.length,
        total_days_worked: totalDaysWorked,
        total_payroll: totalPayroll,
        records
      };

    } catch (error: any) {
      console.error('Error generando reporte de nómina:', error);
      throw new Error(error.message || 'Error al generar el reporte de nómina');
    }
  }

  /**
   * Exporta el reporte de nómina a formato CSV
   */
  static exportToCSV(report: PayrollReport): string {
    const headers = [
      'Empleado',
      'Días Normales',
      'Días Dobles',
      'Días Justificados',
      'Total Días Trabajados',
      'Salario Diario',
      'Total a Pagar'
    ];

    const rows = report.records.map(record => [
      record.employee_name,
      record.regular_days.toString(),
      record.double_days.toString(),
      record.justified_absences.toString(),
      record.total_days_worked.toString(),
      `$${record.daily_salary.toFixed(2)}`,
      `$${record.total_pay.toFixed(2)}`
    ]);

    const totals = [
      'TOTALES',
      '',
      '',
      '',
      report.total_days_worked.toString(),
      '',
      `$${report.total_payroll.toFixed(2)}`
    ];

    const csvContent = [
      `Reporte de Nómina - ${report.period.start_date} al ${report.period.end_date}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      totals.join(',')
    ].join('\n');

    return csvContent;
  }

  /**
   * Obtiene las fechas del período actual (mes en curso)
   */
  static getCurrentMonthPeriod(): { startDate: string; endDate: string } {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Obtiene las fechas del período anterior (mes pasado)
   */
  static getPreviousMonthPeriod(): { startDate: string; endDate: string } {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }
}