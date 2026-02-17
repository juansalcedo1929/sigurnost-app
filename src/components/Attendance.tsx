'use client';

import React, { useState, useEffect } from 'react';
import { AttendanceService } from '../lib/attendance';
import { AuthService } from '../lib/auth';
import { Attendance as AttendanceType, Availability } from '../types';
import { supabase } from '../lib/supabase';

export const Attendance: React.FC = () => {
  const [workDescription, setWorkDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [todayAttendance, setTodayAttendance] = useState<AttendanceType | null>(null);
  const [activeView, setActiveView] = useState<'form' | 'week'>('form');
  const [myAttendances, setMyAttendances] = useState<AttendanceType[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceType | null>(null);
  const [isDoubleDay, setIsDoubleDay] = useState(false);
  const [registerModal, setRegisterModal] = useState<{ date: string; open: boolean }>({ date: '', open: false });
  const [programmedDays, setProgrammedDays] = useState<string[]>([]); // fechas programadas (disponibles)

  // Flag para evitar sobreescritura cuando el usuario está escribiendo
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);

  const user = AuthService.getCurrentUser();

  // Cargar disponibilidad del empleado para la semana actual
  const loadProgrammedDays = async () => {
    if (!user?.employee_id) return;
    const weekRange = getCurrentWeekRange();
    const { data, error } = await supabase
      .from('availabilities')
      .select('fecha')
      .eq('employee_id', user.employee_id)
      .eq('disponible', true)
      .gte('fecha', weekRange.start)
      .lte('fecha', weekRange.end);
    if (!error && data) {
      setProgrammedDays(data.map(a => a.fecha));
    }
  };

  // Función para obtener la fecha actual en zona Pacífico
  const getTodayPacificDate = () => {
    return AttendanceService.getTodayDate();
  };

  // Función para formatear fecha Pacífico legible
  const formatPacificDate = (dateString: string) => {
    return AttendanceService.formatPacificDate(dateString);
  };

  // Función para formatear fecha en historial
  const formatHistoryDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00-08:00');
    return date.toLocaleDateString('es-ES', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Función para obtener el inicio y fin de la semana actual (Lunes a Domingo)
  const getCurrentWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, ...
    
    // Calcular lunes de esta semana
    const monday = new Date(today);
    if (dayOfWeek === 0) {
      // Domingo: retroceder 6 días
      monday.setDate(today.getDate() - 6);
    } else {
      // Lunes a Sábado: retroceder (día - 1) días
      monday.setDate(today.getDate() - (dayOfWeek - 1));
    }
    
    // Calcular domingo de esta semana (lunes + 6 días)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Formatear a YYYY-MM-DD
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    return {
      start: formatDate(monday),
      end: formatDate(sunday),
      monday,
      sunday
    };
  };

  // Obtener los días programados (disponibles) de la semana actual
  const getProgrammedDaysList = () => {
    return programmedDays.map(date => {
      const d = new Date(date + 'T00:00:00');
      return {
        date,
        dayOfWeek: d.toLocaleDateString('es-ES', { weekday: 'long' }),
        formatted: formatHistoryDate(date)
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  };

  // Filtrar asistencias de la semana actual y crear un mapa por fecha
  const getWeekAttendancesMap = () => {
    const weekRange = getCurrentWeekRange();
    const weekAttendances = myAttendances.filter(att => 
      att.attendance_date >= weekRange.start && att.attendance_date <= weekRange.end
    );
    const map = new Map<string, AttendanceType>();
    weekAttendances.forEach(att => map.set(att.attendance_date, att));
    return map;
  };

  useEffect(() => {
    if (user?.employee_id) {
      checkTodayAttendance();
      loadMyAttendances();
      loadProgrammedDays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkTodayAttendance = async () => {
    if (!user?.employee_id) return;
    
    const attendance = await AttendanceService.getTodayAttendance(user.employee_id);
    setTodayAttendance(attendance);

    if (attendance && !isDescriptionFocused) {
      setWorkDescription(attendance.work_description || '');
      setIsDoubleDay(attendance.is_double_day || false);
    }
  };

  const loadMyAttendances = async () => {
    if (!user?.employee_id) return;
    const attendances = await AttendanceService.getMyAttendances();
    setMyAttendances(attendances);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employee_id) {
      setMessage('Error: No se pudo identificar al empleado');
      return;
    }

    setLoading(true);
    setMessage('');

    const todayPacific = getTodayPacificDate();
    
    console.log('Registrando asistencia para la fecha Pacífico:', todayPacific);
    
    const result = await AttendanceService.markAttendance(
      user.employee_id,
      todayPacific,
      true,
      workDescription,
      isDoubleDay,
      false // justified siempre false
    );

    setLoading(false);

    if (result.success) {
      setMessage(`Asistencia registrada correctamente para el ${formatPacificDate(todayPacific)}`);
      checkTodayAttendance();
      loadMyAttendances();
    } else {
      setMessage(result.error || 'Error al registrar asistencia');
    }
  };

  const handleRegisterForDate = async (date: string, description: string, isDouble: boolean) => {
    if (!user?.employee_id) return;
    setLoading(true);
    // Asumimos que si se está registrando desde la semana, es porque asistió (true)
    const result = await AttendanceService.markAttendance(
      user.employee_id,
      date,
      true,
      description,
      isDouble,
      false
    );
    setLoading(false);
    if (result.success) {
      setMessage(`Asistencia registrada para ${formatHistoryDate(date)}`);
      loadMyAttendances();
      setRegisterModal({ date: '', open: false });
    } else {
      alert('Error: ' + result.error);
    }
  };

  if (!user) {
    return (
      <div className="form-container">
        <div className="error-message">No hay usuario logueado</div>
      </div>
    );
  }

  const todayPacific = getTodayPacificDate();
  const todayDisplayDate = formatPacificDate(todayPacific);
  const programmedDaysList = getProgrammedDaysList();
  const attendancesMap = getWeekAttendancesMap();
  const weekRange = getCurrentWeekRange();

  // Formatear rango de semana para mostrar
  const formatWeekRange = () => {
    const start = weekRange.monday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const end = weekRange.sunday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `${start} - ${end}`;
  };

  // Determinar si una fecha es pasada (incluyendo hoy como "pasado" para permitir registro)
  const isPastOrToday = (date: string) => {
    const today = getTodayPacificDate();
    return date <= today;
  };

  return (
    <div className="attendance-container">
      <div className="section-header">
        <h2>Registro de Asistencia</h2>
        <div className="view-tabs">
          <button 
            className={`tab-button ${activeView === 'form' ? 'active' : ''}`}
            onClick={() => setActiveView('form')}
          >
            📝 Hoy
          </button>
          <button 
            className={`tab-button ${activeView === 'week' ? 'active' : ''}`}
            onClick={() => setActiveView('week')}
          >
            📅 Semana Actual
          </button>
        </div>
      </div>

      {activeView === 'form' ? (
        <div className="form-card">
          <div className="form-card-header">
            <h3>Asistencia del Día</h3>
            <div className="date-badge">
              {todayDisplayDate}
            </div>
          </div>

          <div className="employee-info-card">
            <div className="info-item">
              <span className="label">Empleado:</span>
              <span className="value">{user.employee ? user.employee.name : user.username}</span>
            </div>
            <div className="info-item">
              <span className="label">Fecha:</span>
              <span className="value">{todayPacific}</span>
            </div>
            <div className="info-item">
              <span className="label">Estado:</span>
              <span className={`status ${todayAttendance ? 'status-success' : 'status-warning'}`}>
                {todayAttendance ? 'Registrado' : 'Pendiente'}
              </span>
            </div>
          </div>

          {todayAttendance && (
            <div className="success-alert">
              <span className="icon">✅</span>
              <div>
                <strong>Asistencia ya registrada para hoy</strong>
                <p>Puedes actualizar la información si es necesario</p>
                <p className="small-text">
                  Registrado el: {formatPacificDate(todayAttendance.attendance_date)}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="attendance-form">
            <div className="form-group">
              <label htmlFor="workDescription" className="form-label">Descripción del Trabajo</label>
              <textarea
                id="workDescription"
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                onFocus={() => setIsDescriptionFocused(true)}
                onBlur={() => setIsDescriptionFocused(false)}
                rows={4}
                className="form-textarea"
                placeholder="Describe las actividades, tareas y trabajos realizados durante el día..."
                required
              />
            </div>

            {/* Checkbox para jornada doble */}
            <div className="form-group">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={isDoubleDay}
                  onChange={(e) => setIsDoubleDay(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkmark"></span>
                <span className="checkbox-label">Jornada doble</span>
              </label>
            </div>

            {message && (
              <div className={`message ${message.includes('correctamente') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary large"
              >
                {loading ? (
                  <>⏳ Procesando...</>
                ) : todayAttendance ? (
                  <>✏️ Actualizar Asistencia</>
                ) : (
                  <>✅ Registrar Asistencia</>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="week-container">
          <div className="week-header">
            <div>
              <h3>Asistencias de la Semana</h3>
              <p className="week-range">{formatWeekRange()}</p>
            </div>
            <div className="week-stats">
              <div className="week-stat">
                <span className="number">{attendancesMap.size}</span>
                <span className="label">Registrados</span>
              </div>
            </div>
          </div>

          <div className="week-days-list">
            {programmedDaysList.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h4>No hay días programados</h4>
                <p>No has registrado disponibilidad para esta semana</p>
              </div>
            ) : (
              programmedDaysList.map((day) => {
                const attendance = attendancesMap.get(day.date);
                return (
                  <div key={day.date} className={`week-day-card ${attendance ? 'registered' : ''}`}>
                    <div className="day-header">
                      <span className="day-name">{day.dayOfWeek}</span>
                      <span className="day-date">{day.formatted}</span>
                    </div>
                    {attendance ? (
                      <div className="day-attendance">
                        <div className="attendance-info">
                          <span className={`status-badge present`}>✅ Asistió</span>
                          {attendance.is_double_day && <span className="badge double">🕑 Doble</span>}
                          {attendance.justified && <span className="badge justified">📄 Justificado</span>}
                        </div>
                        {attendance.work_description && (
                          <button 
                            onClick={() => setSelectedAttendance(attendance)}
                            className="btn-text small"
                          >
                            👁️ Ver descripción
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setWorkDescription(attendance.work_description || '');
                            setIsDoubleDay(attendance.is_double_day || false);
                            setRegisterModal({ date: day.date, open: true });
                          }}
                          className="btn-edit-small"
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    ) : (
                      <div className="day-actions">
                        <button 
                          onClick={() => {
                            setWorkDescription('');
                            setIsDoubleDay(false);
                            setRegisterModal({ date: day.date, open: true });
                          }}
                          className="btn-register"
                        >
                          ➕ Registrar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal para registrar/editar asistencia de un día específico */}
      {registerModal.open && (
        <div className="modal-overlay" onClick={() => setRegisterModal({ date: '', open: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 Registrar Asistencia</h3>
              <button 
                onClick={() => setRegisterModal({ date: '', open: false })}
                className="btn-close"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-info">
                <div className="info-row">
                  <span className="label">Fecha:</span>
                  <span className="value">{formatHistoryDate(registerModal.date)}</span>
                </div>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                await handleRegisterForDate(
                  registerModal.date,
                  workDescription,
                  isDoubleDay
                );
              }}>
                <div className="form-group">
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={isDoubleDay}
                      onChange={(e) => setIsDoubleDay(e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkmark"></span>
                    <span className="checkbox-label">Jornada doble</span>
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="modalWorkDescription" className="form-label">Descripción del Trabajo</label>
                  <textarea
                    id="modalWorkDescription"
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    rows={4}
                    className="form-textarea"
                    placeholder="Describe las actividades realizadas..."
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    type="button"
                    onClick={() => setRegisterModal({ date: '', open: false })}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? '⏳ Guardando...' : '💾 Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver descripción */}
      {selectedAttendance && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Descripción del Trabajo</h3>
              <button 
                onClick={() => setSelectedAttendance(null)}
                className="btn-close"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-info">
                <div className="info-row">
                  <span className="label">Fecha:</span>
                  <span className="value">{formatPacificDate(selectedAttendance.attendance_date)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Estado:</span>
                  <span className="value status-success">Asistió</span>
                </div>
                {selectedAttendance.is_double_day && (
                  <div className="info-row">
                    <span className="label">Jornada:</span>
                    <span className="value" style={{ color: '#ff9900', fontWeight: 'bold' }}>Doble</span>
                  </div>
                )}
                {selectedAttendance.justified && (
                  <div className="info-row">
                    <span className="label">Justificado:</span>
                    <span className="value" style={{ color: '#4caf50', fontWeight: 'bold' }}>Sí</span>
                  </div>
                )}
              </div>
              <div className="description-content">
                <h4>Actividades realizadas:</h4>
                <p>{selectedAttendance.work_description}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setSelectedAttendance(null)}
                className="btn-primary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos adicionales (se mantienen igual) */}
      <style jsx>{`
        .week-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .week-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .week-range {
          color: var(--text-light);
          font-size: 14px;
          margin-top: 4px;
        }

        .week-stats {
          display: flex;
          gap: 20px;
        }

        .week-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 12px;
          background: var(--background);
          border-radius: 8px;
          min-width: 70px;
        }

        .week-stat .number {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
        }

        .week-stat .label {
          font-size: 12px;
          color: var(--text-light);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .week-days-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .week-day-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s ease;
        }

        .week-day-card.registered {
          border-left: 4px solid var(--success);
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .day-name {
          font-weight: 600;
          color: var(--text);
          font-size: 16px;
        }

        .day-date {
          font-size: 14px;
          color: var(--text-light);
        }

        .day-attendance {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }

        .attendance-info {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .status-badge.present {
          background: #d1fae5;
          color: #065f46;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge.double {
          background: #fef3c7;
          color: #92400e;
        }

        .badge.justified {
          background: #d1fae5;
          color: #065f46;
        }

        .btn-text.small {
          font-size: 12px;
          padding: 4px 8px;
        }

        .btn-edit-small {
          background: none;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
          color: var(--primary);
        }

        .btn-edit-small:hover {
          background: var(--primary);
          color: white;
        }

        .day-actions {
          display: flex;
          justify-content: flex-end;
        }

        .btn-register {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-register:hover {
          background: var(--primary-dark);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          background: var(--card);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h4 {
          margin: 0 0 8px 0;
          color: var(--text);
        }

        .empty-state p {
          margin: 0;
          color: var(--text-light);
        }

        @media (max-width: 480px) {
          .week-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .week-stats {
            width: 100%;
            justify-content: space-between;
          }
          .day-attendance {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};