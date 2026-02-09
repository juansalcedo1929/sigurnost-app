import React, { useState, useEffect } from 'react';
import { AttendanceService } from '../lib/attendance';
import { AuthService } from '../lib/auth';

interface AttendanceFormProps {
  employeeId?: string;
  date?: string;
  attendanceId?: string; // opcional: si viene, estamos editando una asistencia
  initialWorkDescription?: string | null;
  initialHours?: number;
  initialAttended?: boolean;
  onSuccess?: () => void;
}

export const AttendanceForm: React.FC<AttendanceFormProps> = ({
  employeeId,
  date = new Date().toISOString().split('T')[0],
  attendanceId,
  initialWorkDescription = '',
  initialHours = 8,
  initialAttended = true,
  onSuccess
}) => {
  const [attended, setAttended] = useState<boolean>(initialAttended);
  const [workDescription, setWorkDescription] = useState<string>(initialWorkDescription ?? '');
  const [hoursWorked, setHoursWorked] = useState<number>(initialHours);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | undefined>(employeeId);

  // Flag para saber si el usuario está escribiendo (evitar sobreescrituras externas)
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // Si no se pasó employeeId, obtener del usuario actual
    if (!employeeId) {
      const user = AuthService.getCurrentUser();
      if (user?.employee_id) {
        setCurrentEmployeeId(user.employee_id);
      }
    } else {
      setCurrentEmployeeId(employeeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  // Inicializar valores cuando props iniciales cambien,
  // pero no sobreescribir si el usuario ya está escribiendo (isFocused)
  useEffect(() => {
    if (!isFocused) {
      setWorkDescription(initialWorkDescription ?? '');
      setHoursWorked(initialHours);
      setAttended(initialAttended);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkDescription, initialHours, initialAttended]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployeeId) {
      setError('No se pudo identificar al empleado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Si estamos editando por id concreto, actualizar descripción primero
      if (attendanceId) {
        // Si solo queremos actualizar descripción
        const descResult = await AttendanceService.updateAttendanceDescription(attendanceId, workDescription);
        if (!descResult.success) {
          setError(descResult.error || 'Error al actualizar descripción');
          setLoading(false);
          return;
        }
        // luego actualizamos attended/hours vía markAttendance por si cambian
        const markResult = await AttendanceService.markAttendance(
          currentEmployeeId,
          date,
          attended,
          workDescription        );
        if (!markResult.success) {
          setError(markResult.error || 'Error al actualizar asistencia');
          setLoading(false);
          return;
        }
      } else {
        // modo creación
        const result = await AttendanceService.markAttendance(
          currentEmployeeId,
          date,
          attended,
          workDescription
        );
        if (!result.success) {
          setError(result.error || 'Error al registrar asistencia');
          setLoading(false);
          return;
        }
      }

      // éxito
      if (!attendanceId) {
        setWorkDescription('');
        setHoursWorked(initialHours);
        setAttended(initialAttended);
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (!currentEmployeeId) {
    return <div>No se pudo identificar al empleado</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={attended}
            onChange={(e) => setAttended(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span>Asistió el día</span>
        </label>
      </div>

      {attended && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Horas trabajadas
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descripción del trabajo realizado
            </label>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Describe las actividades realizadas..."
              required
            />
          </div>
        </>
      )}

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Procesando...' : (attendanceId ? 'Actualizar Asistencia' : 'Registrar Asistencia')}
      </button>
    </form>
  );
};
