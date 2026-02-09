// src/types/index.ts
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'employee';
  employee_id?: string;
  created_at: string;
  employee?: Employee;
}

export interface Availability {
  id: string;
  employee_id: string;
  fecha: string;
  disponible: boolean;
  created_at: string;
  employees?: Employee;
}

export interface Employee {
  id: string;
  name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  salary: number; // Salario diario
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  attendance_date: string;
  attended: boolean;
  work_description: string | null;
  hours_worked: number;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'approved' | 'rejected'; 
  justified?: boolean;
  is_double_day?: boolean;
  employee?: Employee;
}

export interface Schedule {
  id: string;
  employee_id: string;
  work_date: string;
  scheduled_hours: number;
  created_at: string;
  employee?: Employee;
}

// Interfaz para el reporte de nómina
export interface PayrollRecord {
  employee_id: string;
  employee_name: string;
  regular_days: number;
  double_days: number;
  justified_absences: number;
  total_days_worked: number;
  daily_salary: number;
  total_pay: number;
  attendances: Attendance[];
}

export interface PayrollReport {
  period: {
    start_date: string;
    end_date: string;
  };
  total_employees: number;
  total_days_worked: number;
  total_payroll: number;
  records: PayrollRecord[];
}