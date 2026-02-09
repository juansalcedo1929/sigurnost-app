'use client';

import React, { useState, useEffect } from 'react';
import { AttendanceService } from '../lib/attendance';
import { AuthService } from '../lib/auth';
import { Attendance as AttendanceType } from '../types';

export const Attendance: React.FC = () => {
  const [workDescription, setWorkDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [todayAttendance, setTodayAttendance] = useState<AttendanceType | null>(null);
  const [activeView, setActiveView] = useState<'form' | 'history'>('form');
  const [myAttendances, setMyAttendances] = useState<AttendanceType[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceType | null>(null);
  const [isDoubleDay, setIsDoubleDay] = useState(false);

  // Flag para evitar sobreescritura cuando el usuario está escribiendo
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);

  const user = AuthService.getCurrentUser();

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
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    // Calcular domingo de esta semana
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
      monday: monday,
      sunday: sunday
    };
  };

  // Filtrar asistencias de la semana actual
  const getCurrentWeekAttendances = () => {
    const weekRange = getCurrentWeekRange();
    return myAttendances.filter(attendance => {
      const attendanceDate = attendance.attendance_date;
      return attendanceDate >= weekRange.start && attendanceDate <= weekRange.end;
    });
  };

  useEffect(() => {
    if (user?.employee_id) {
      checkTodayAttendance();
      loadMyAttendances();
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
      false
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

  if (!user) {
    return (
      <div className="form-container">
        <div className="error-message">No hay usuario logueado</div>
      </div>
    );
  }

  const todayPacific = getTodayPacificDate();
  const todayDisplayDate = formatPacificDate(todayPacific);
  const weekAttendances = getCurrentWeekAttendances();
  const weekRange = getCurrentWeekRange();

  // Formatear fecha de la semana para mostrar
  const formatWeekRange = () => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short',
      timeZone: 'America/Los_Angeles'
    };
    
    const mondayStr = weekRange.monday.toLocaleDateString('es-ES', options);
    const sundayStr = weekRange.sunday.toLocaleDateString('es-ES', options);
    
    return `${mondayStr} - ${sundayStr}`;
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
            📝 Registrar
          </button>
          <button 
            className={`tab-button ${activeView === 'history' ? 'active' : ''}`}
            onClick={() => setActiveView('history')}
          >
            📋 Semana Actual
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
        <div className="history-container">
          <div className="history-header">
            <div>
              <h3>Mis Asistencias - Semana Actual</h3>
              <p className="week-range">{formatWeekRange()}</p>
            </div>
            <div className="week-stats">
              <div className="week-stat">
                <span className="number">{weekAttendances.length}</span>
                <span className="label">Días</span>
              </div>
              <div className="week-stat">
                <span className="number">
                  {weekAttendances.filter(a => a.is_double_day).length}
                </span>
                <span className="label">Dobles</span>
              </div>
            </div>
          </div>

          {/* Indicador de semana */}
          <div className="week-indicator">
            <div className="week-indicator-content">
              <span className="week-icon">📅</span>
              <div>
                <strong>Vista de semana actual</strong>
                <p>Solo se muestran las asistencias de esta semana (lunes a domingo)</p>
              </div>
            </div>
          </div>

          <div className="attendance-list">
            {weekAttendances.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h4>No hay asistencias esta semana</h4>
                <p>Tus registros de asistencia para esta semana aparecerán aquí</p>
              </div>
            ) : (
              weekAttendances.map((attendance) => (
                <div key={attendance.id} className="attendance-card">
                  <div className="card-main">
                    <div className="date-status">
                      <div className="date-day">
                        <span className="weekday">
                          {new Date(attendance.attendance_date + 'T00:00:00-08:00')
                            .toLocaleDateString('es-ES', { 
                              weekday: 'long',
                              timeZone: 'America/Los_Angeles' 
                            })}
                        </span>
                        <span className="date">{formatHistoryDate(attendance.attendance_date)}</span>
                      </div>
                      <div className="status-container">
                        <span className="attendance-status present">
                          ✅ Asistió
                        </span>
                        {attendance.is_double_day && (
                          <span className="double-badge">
                            🕑 Doble
                          </span>
                        )}
                        {attendance.justified && (
                          <span className="justified-badge">
                            ✅ Justificado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {attendance.work_description && (
                    <div className="card-actions">
                      <button 
                        onClick={() => setSelectedAttendance(attendance)}
                        className="btn-text"
                      >
                        👁️ Ver descripción
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
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
                  <div className="info-row highlight">
                    <span className="label">Jornada:</span>
                    <span className="value double-day-value">
                      <span className="double-icon">🕑</span>
                      <span className="double-text">Jornada Doble</span>
                      <span className="double-hours">(16 horas)</span>
                    </span>
                  </div>
                )}
                {selectedAttendance.justified && (
                  <div className="info-row highlight">
                    <span className="label">Justificado:</span>
                    <span className="value justified-value">
                      <span className="justified-icon">📄</span>
                      <span>Día Justificado</span>
                    </span>
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

      {/* Estilos adicionales */}
      <style jsx>{`
        .week-range {
          color: var(--text-light);
          font-size: 14px;
          margin-top: 4px;
          font-weight: 500;
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
        
        .week-indicator {
          background: linear-gradient(135deg, #f0f7ff, #e6f0ff);
          border: 1px solid #c2d9ff;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }
        
        .week-indicator-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .week-icon {
          font-size: 24px;
          color: var(--primary);
        }
        
        .week-indicator-content strong {
          display: block;
          color: var(--text);
          font-size: 14px;
          margin-bottom: 2px;
        }
        
        .week-indicator-content p {
          margin: 0;
          font-size: 13px;
          color: var(--text-light);
          line-height: 1.4;
        }
        
        .date-day {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .weekday {
          font-weight: 600;
          color: var(--text);
          font-size: 15px;
        }
        
        .status-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        
        .double-badge {
          background: linear-gradient(135deg, #ffd700, #ffb347);
          color: #000;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .justified-badge {
          background: linear-gradient(135deg, #4caf50, #2e7d32);
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .info-row.highlight {
          background: rgba(255, 153, 0, 0.05);
          padding: 8px;
          border-radius: 6px;
          border-left: 3px solid #ff9900;
        }
        
        .double-day-value {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }
        
        .double-icon {
          font-size: 18px;
        }
        
        .double-text {
          color: #ff9900;
        }
        
        .double-hours {
          font-size: 12px;
          color: var(--text-light);
          font-weight: normal;
        }
        
        .justified-value {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #4caf50;
        }
        
        .justified-icon {
          font-size: 18px;
        }
        
        @media (max-width: 480px) {
          .history-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .week-stats {
            width: 100%;
            justify-content: space-between;
          }
          
          .week-stat {
            flex: 1;
            padding: 10px;
          }
          
          .week-indicator-content {
            flex-direction: column;
            text-align: center;
            gap: 8px;
          }
          
          .week-icon {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
};