'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceService } from '../lib/attendance';
import { Attendance as AttendanceType, Employee } from '../types';
import { supabase } from '../lib/supabase';

export const AttendanceAdmin: React.FC = () => {
  const [attendances, setAttendances] = useState<AttendanceType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [editingAttendance, setEditingAttendance] = useState<AttendanceType | null>(null);
  const [viewingAttendance, setViewingAttendance] = useState<AttendanceType | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'custom'>('week');

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
      monday,
      sunday
    };
  };

  const loadAttendances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AttendanceService.getAllAttendances();
      const processedData = (data || []).map(att => ({
        ...att,
        status: att.status || 'pending'
      }));
      setAttendances(processedData);
    } catch {
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (!error && data) {
        setEmployees(data);
      }
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    loadAttendances();
    loadEmployees();
  }, [loadAttendances, loadEmployees]);

  useEffect(() => {
    // Inicializar con semana actual
    if (viewMode === 'week') {
      const weekRange = getCurrentWeekRange();
      setDateRange({
        from: weekRange.start,
        to: weekRange.end
      });
    }
  }, [viewMode]);

  const handleValidateAttendance = async (attendanceId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await AttendanceService.updateAttendanceStatus(attendanceId, status);
      if (res.success) {
        setAttendances(prev => prev.map(att => att.id === attendanceId ? { ...att, status } : att));
        alert('✅ Estado actualizado correctamente');
      } else {
        alert('Error al actualizar la asistencia: ' + (res.error || ''));
      }
    } catch {
      alert('Error al validar la asistencia');
    }
  };

  const filteredAttendances = attendances.filter(att => {
    try {
      const attendanceDate = new Date(att.attendance_date);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);

      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      attendanceDate.setHours(12, 0, 0, 0);

      const dateInRange = attendanceDate >= fromDate && attendanceDate <= toDate;
      const employeeMatch = selectedEmployee === 'all' || att.employee_id === selectedEmployee;
      const statusMatch = activeFilter === 'all' || att.status === activeFilter;

      return dateInRange && employeeMatch && statusMatch;
    } catch {
      return false;
    }
  });

  const openViewModal = (attendance: AttendanceType) => setViewingAttendance(attendance);
  const closeViewModal = () => setViewingAttendance(null);
  const openEditModal = (attendance: AttendanceType) => setEditingAttendance({ ...attendance });
  const closeEditModal = () => setEditingAttendance(null);

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingAttendance) return;

    setSaving(true);
    try {
      const descr = editingAttendance.work_description === null ? undefined : editingAttendance.work_description;

      const res = await AttendanceService.markAttendance(
        editingAttendance.employee_id,
        editingAttendance.attendance_date,
        editingAttendance.attended,
        descr,
        editingAttendance.is_double_day || false,
        editingAttendance.justified || false
      );

      if (!res.success) {
        alert('Error al guardar cambios: ' + (res.error || ''));
      } else {
        await loadAttendances();
        closeEditModal();
        alert('✅ Cambios guardados correctamente');
      }
    } catch {
      alert('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const getEmployeeName = (attendance: AttendanceType) => {
    if (attendance.employee && typeof attendance.employee === 'object' && 'name' in attendance.employee) {
      return (attendance.employee as any).name;
    }
    const employee = employees.find(emp => emp.id === attendance.employee_id);
    return employee ? employee.name : 'Empleado';
  };

  const formatDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  const formatWeekRange = () => {
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short',
      timeZone: 'America/Los_Angeles'
    };
    
    const startStr = start.toLocaleDateString('es-ES', options);
    const endStr = end.toLocaleDateString('es-ES', options);
    
    return `${startStr} - ${endStr}`;
  };

  const handleSetCurrentWeek = () => {
    const weekRange = getCurrentWeekRange();
    setDateRange({
      from: weekRange.start,
      to: weekRange.end
    });
    setViewMode('week');
  };

  // Estadísticas de la semana
  const weekStats = {
    total: filteredAttendances.length,
    pending: filteredAttendances.filter(a => a.status === 'pending').length,
    approved: filteredAttendances.filter(a => a.status === 'approved').length,
    rejected: filteredAttendances.filter(a => a.status === 'rejected').length,
    doubleDays: filteredAttendances.filter(a => a.is_double_day).length,
    justified: filteredAttendances.filter(a => a.justified).length
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Cargando asistencias...</p>

        <style jsx>{`
          .loading-container {
            display: grid;
            place-items: center;
            height: 50vh;
            color: var(--text);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 10px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-attendance-container">
      <div className="section-header">
        <div>
          <h2>📋 Gestión de Asistencias</h2>
          <p className="subtitle">
            {viewMode === 'week' ? 'Semana Actual' : 'Rango Personalizado'} • {formatWeekRange()}
          </p>
        </div>
      </div>

      {/* Estadísticas de la semana */}
      <div className="stats-container">
        <div className="stat-item total">
          <div className="stat-number">{weekStats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-item pending">
          <div className="stat-number">{weekStats.pending}</div>
          <div className="stat-label">Pendientes</div>
        </div>
        <div className="stat-item approved">
          <div className="stat-number">{weekStats.approved}</div>
          <div className="stat-label">Aprobadas</div>
        </div>
        <div className="stat-item rejected">
          <div className="stat-number">{weekStats.rejected}</div>
          <div className="stat-label">Rechazadas</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-card">
        <div className="filters-header">
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('week');
                handleSetCurrentWeek();
              }}
            >
              📅 Semana Actual
            </button>
            <button
              className={`mode-btn ${viewMode === 'custom' ? 'active' : ''}`}
              onClick={() => setViewMode('custom')}
            >
              📆 Rango Personalizado
            </button>
          </div>
        </div>

        <div className="filters-grid">
          <div className="filter-field">
            <label className="filter-label">Estado</label>
            <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as any)} className="filter-select">
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>

          <div className="filter-field">
            <label className="filter-label">Empleado</label>
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="filter-select">
              <option value="all">Todos</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>

          {viewMode === 'custom' && (
            <div className="filter-dates">
              <div className="filter-field">
                <label className="filter-label">Desde</label>
                <input type="date" value={dateRange.from} onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} className="filter-input" />
              </div>
              <div className="filter-field">
                <label className="filter-label">Hasta</label>
                <input type="date" value={dateRange.to} onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} className="filter-input" />
              </div>
            </div>
          )}

          {viewMode === 'week' && (
            <div className="filter-field">
              <label className="filter-label">Semana Actual</label>
              <div className="week-info">
                <div className="week-dates">{formatWeekRange()}</div>
                <button onClick={handleSetCurrentWeek} className="btn-refresh-week">
                  🔄 Esta semana
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="attendances-list">
        {filteredAttendances.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h4>No hay asistencias</h4>
            <p>No se encontraron registros con los filtros aplicados</p>
            {viewMode === 'week' && (
              <button onClick={handleSetCurrentWeek} className="btn btn-primary" style={{ marginTop: '12px' }}>
                Ver semana actual
              </button>
            )}
          </div>
        ) : (
          <div className="cards-column">
            {filteredAttendances.map(att => (
              <article key={att.id} className="attendance-card">
                <div className="card-top">
                  <div>
                    <div className="emp-name">{getEmployeeName(att)}</div>
                    <div className="emp-meta">
                      <span className="date-badge">{formatDate(att.attendance_date)}</span>
                      <span className={`attendance-status ${att.attended ? 'present' : 'absent'}`}>
                        {att.attended ? '✅ Asistió' : '❌ No asistió'}
                      </span>
                      {att.is_double_day && (
                        <span className="double-badge">
                          🕑 Doble
                        </span>
                      )}
                      {att.justified && (
                        <span className="justified-badge">
                          📄 Justificado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    {att.work_description && (
                      <button title="Ver descripción" onClick={() => openViewModal(att)} className="btn-icon">
                        👁️
                      </button>
                    )}
                    {att.status !== 'approved' && (
                      <button title="Aprobar" onClick={() => handleValidateAttendance(att.id, 'approved')} className="btn-icon success">
                        ✅
                      </button>
                    )}
                    {att.status !== 'rejected' && (
                      <button title="Rechazar" onClick={() => handleValidateAttendance(att.id, 'rejected')} className="btn-icon danger">
                        ❌
                      </button>
                    )}
                    <button title="Editar" onClick={() => openEditModal(att)} className="btn-icon">
                      ✏️
                    </button>
                  </div>
                </div>

                <div className="card-middle">
                  <div className="status-info">
                    <span className={`status-chip ${att.status}`}>
                      {att.status === 'pending' ? '⏳ Pendiente' : 
                       att.status === 'approved' ? '✅ Aprobado' : 
                       '❌ Rechazado'}
                    </span>
                    <span className="time-info">
                      📅 {att.created_at ? formatTime(att.created_at) : '—'}
                    </span>
                  </div>
                </div>

                {att.work_description && (
                  <div className="card-desc">
                    <div className="desc-label">Descripción:</div>
                    {att.work_description.length > 120 ? att.work_description.slice(0, 120) + '…' : att.work_description}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Ver */}
      {viewingAttendance && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Descripción de {getEmployeeName(viewingAttendance)}</h3>
              <button onClick={closeViewModal} className="btn-close" aria-label="Cerrar">×</button>
            </div>

            <div className="modal-body">
              <div className="modal-meta">
                <div className="meta-item">
                  <span className="meta-label">📅 Fecha:</span>
                  <span className="meta-value">{formatDate(viewingAttendance.attendance_date)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">🎯 Estado:</span>
                  <span className={`meta-value status-${viewingAttendance.status}`}>
                    {viewingAttendance.status === 'approved' ? '✅ Aprobado' : 
                     viewingAttendance.status === 'rejected' ? '❌ Rechazado' : 
                     '⏳ Pendiente'}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">👤 Asistencia:</span>
                  <span className="meta-value">
                    {viewingAttendance.attended ? '✅ Asistió' : '❌ No asistió'}
                  </span>
                </div>
                {viewingAttendance.is_double_day && (
                  <div className="meta-item highlight">
                    <span className="meta-label">🕑 Jornada:</span>
                    <span className="meta-value double-highlight">
                      Doble (16 horas)
                    </span>
                  </div>
                )}
                {viewingAttendance.justified && (
                  <div className="meta-item highlight">
                    <span className="meta-label">📄 Justificado:</span>
                    <span className="meta-value justified-highlight">
                      Sí
                    </span>
                  </div>
                )}
              </div>
              
              <div className="modal-section">
                <h4>📝 Descripción del trabajo</h4>
                <p className="modal-text">{viewingAttendance.work_description || 'No se proporcionó descripción'}</p>
              </div>

              <div className="modal-actions">
                <button onClick={() => { handleValidateAttendance(viewingAttendance.id, 'approved'); closeViewModal(); }} className="btn-success">
                  ✅ Aprobar
                </button>
                <button onClick={() => { handleValidateAttendance(viewingAttendance.id, 'rejected'); closeViewModal(); }} className="btn-danger">
                  ❌ Rechazar
                </button>
                <button onClick={() => { closeViewModal(); openEditModal(viewingAttendance); }} className="btn-primary ghost">
                  ✏️ Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar */}
      {editingAttendance && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <form onSubmit={handleSaveEdit} className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Editar Asistencia — {getEmployeeName(editingAttendance)}</h3>
              <button type="button" onClick={closeEditModal} className="btn-close">×</button>
            </div>

            <div className="modal-body grid">
              <div className="form-readonly">
                <label className="field-label">📅 Fecha</label>
                <div className="readonly-box">{formatDate(editingAttendance.attendance_date)}</div>
              </div>

              <div className="form-field">
                <label className="field-label">Asistió</label>
                <select
                  value={editingAttendance.attended ? 'yes' : 'no'}
                  onChange={(e) => setEditingAttendance(prev => prev ? { 
                    ...prev, 
                    attended: e.target.value === 'yes',
                    is_double_day: e.target.value === 'yes' ? prev.is_double_day : false,
                    justified: e.target.value === 'yes' ? false : prev.justified
                  } : prev)}
                  className="field-input"
                >
                  <option value="yes">✅ Sí</option>
                  <option value="no">❌ No</option>
                </select>
              </div>

              {/* Checkbox para jornada doble (solo si asistió) */}
              {editingAttendance.attended && (
                <div className="form-field">
                  <div className="checkbox-wrapper">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingAttendance.is_double_day || false}
                        onChange={(e) => setEditingAttendance(prev => prev ? { ...prev, is_double_day: e.target.checked } : prev)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        <span className="checkbox-title">Jornada doble</span>
                        <span className="checkbox-description">16 horas de trabajo</span>
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Checkbox para justificado (solo si no asistió) */}
              {!editingAttendance.attended && (
                <div className="form-field">
                  <div className="checkbox-wrapper">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingAttendance.justified || false}
                        onChange={(e) => setEditingAttendance(prev => prev ? { ...prev, justified: e.target.checked } : prev)}
                        className="checkbox-input"
                      />
                      <span className="checkbox-custom"></span>
                      <span className="checkbox-text">
                        <span className="checkbox-title">Día justificado</span>
                        <span className="checkbox-description">Ausencia con justificación válida</span>
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="form-field full">
                <label className="field-label">📝 Descripción del trabajo</label>
                <textarea
                  rows={6}
                  value={editingAttendance.work_description ?? ''}
                  onChange={(e) => setEditingAttendance(prev => prev ? { ...prev, work_description: e.target.value } : prev)}
                  className="field-input textarea"
                  placeholder="Describe las actividades realizadas..."
                />
              </div>

              <div className="modal-actions end">
                <button type="button" onClick={() => { handleValidateAttendance(editingAttendance.id, 'approved'); closeEditModal(); }} className="btn-success">
                  ✅ Aprobar
                </button>
                <button type="button" onClick={() => { handleValidateAttendance(editingAttendance.id, 'rejected'); closeEditModal(); }} className="btn-danger">
                  ❌ Rechazar
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? '💾 Guardando...' : '💾 Guardar cambios'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Estilos */}
      <style jsx>{`
        :root {
          --primary: #3B82F6;
          --primary-dark: #2563EB;
          --success: #10B981;
          --success-dark: #059669;
          --warning: #F59E0B;
          --danger: #EF4444;
          --danger-dark: #DC2626;
          --card: #ffffff;
          --background: #f8fafc;
          --border: #e5e7eb;
          --text: #111827;
          --text-light: #6b7280;
        }

        .admin-attendance-container {
          display: grid;
          gap: 16px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .section-header h2 {
          margin: 0;
          font-weight: 800;
          letter-spacing: -0.02em;
          font-size: 24px;
        }
        
        .subtitle {
          margin: 4px 0 0;
          color: var(--text-light);
          font-size: 14px;
          font-weight: 500;
        }

        /* Stats */
        .stats-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        
        @media (max-width: 768px) {
          .stats-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 480px) {
          .stats-container {
            grid-template-columns: 1fr;
          }
        }
        
        .stat-item {
          padding: 16px 12px;
          border-radius: 14px;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 16px rgba(0,0,0,0.08);
          transition: transform 0.2s ease;
        }
        
        .stat-item:hover {
          transform: translateY(-2px);
        }
        
        .stat-item .stat-number {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 4px;
        }
        
        .stat-item .stat-label {
          font-size: 13px;
          opacity: 0.9;
          font-weight: 600;
        }
        
        .stat-item.total { background: linear-gradient(135deg, #3B82F6, #1D4ED8); }
        .stat-item.pending { background: linear-gradient(135deg, #F59E0B, #D97706); }
        .stat-item.approved { background: linear-gradient(135deg, #10B981, #059669); }
        .stat-item.rejected { background: linear-gradient(135deg, #EF4444, #DC2626); }

        /* Filters */
        .filters-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 10px 24px rgba(0,0,0,0.04);
        }
        
        .filters-header {
          margin-bottom: 16px;
        }
        
        .view-mode-toggle {
          display: flex;
          gap: 8px;
          border-radius: 10px;
          padding: 4px;
          background: var(--background);
          border: 1px solid var(--border);
        }
        
        .mode-btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .mode-btn.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        
        .mode-btn:not(.active):hover {
          background: rgba(59, 130, 246, 0.1);
        }
        
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .filter-field { display: flex; flex-direction: column; gap: 8px; }
        .filter-label { font-size: 13px; font-weight: 600; color: var(--text); }
        
        .filter-select,
        .filter-input {
          appearance: none;
          border: 1px solid var(--border);
          background: #fff;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          color: var(--text);
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
        }
        
        .filter-select:focus,
        .filter-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
          outline: none;
        }
        
        .filter-dates {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        .week-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .week-dates {
          padding: 12px 14px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          color: var(--primary);
        }
        
        .btn-refresh-week {
          padding: 10px 14px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .btn-refresh-week:hover {
          background: var(--primary-dark);
        }

        /* Cards list */
        .attendances-list { margin-top: 4px; }
        
        .cards-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .attendance-card {
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          background: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }
        
        .attendance-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          border-color: var(--primary-light);
        }
        
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 12px;
        }
        
        .emp-name { 
          font-weight: 700; 
          font-size: 16px; 
          color: var(--text);
          margin-bottom: 8px;
        }
        
        .emp-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        
        .date-badge {
          background: var(--background);
          color: var(--text);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--border);
        }
        
        .attendance-status {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }
        
        .attendance-status.present {
          background: linear-gradient(135deg, #D1FAE5, #A7F3D0);
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        
        .attendance-status.absent {
          background: linear-gradient(135deg, #FEE2E2, #FECACA);
          color: #991B1B;
          border: 1px solid #FECACA;
        }
        
        .double-badge {
          background: linear-gradient(135deg, #FEF3C7, #FDE68A);
          color: #92400E;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #FDE68A;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .justified-badge {
          background: linear-gradient(135deg, #D1FAE5, #A7F3D0);
          color: #065F46;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #A7F3D0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .card-actions { 
          display: flex; 
          gap: 6px; 
          flex-shrink: 0;
        }
        
        .btn-icon {
          width: 36px;
          height: 36px;
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 16px;
        }
        
        .btn-icon:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .btn-icon.success {
          color: var(--success);
          border-color: #A7F3D0;
          background: #F0FDF4;
        }
        
        .btn-icon.success:hover {
          background: var(--success);
          color: white;
          border-color: var(--success);
        }
        
        .btn-icon.danger {
          color: var(--danger);
          border-color: #FECACA;
          background: #FEF2F2;
        }
        
        .btn-icon.danger:hover {
          background: var(--danger);
          color: white;
          border-color: var(--danger);
        }
        
        .card-middle {
          margin: 12px 0;
          padding: 12px 0;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        
        .status-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .status-chip {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        
        .status-chip.pending { 
          background: #FFFBEB; 
          color: #92400E; 
          border: 1px solid #FDE68A;
        }
        
        .status-chip.approved { 
          background: #D1FAE5; 
          color: #065F46; 
          border: 1px solid #A7F3D0;
        }
        
        .status-chip.rejected { 
          background: #FEE2E2; 
          color: #991B1B; 
          border: 1px solid #FECACA;
        }
        
        .time-info {
          font-size: 13px;
          color: var(--text-light);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .card-desc {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        
        .desc-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-light);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .card-desc p {
          margin: 0;
          color: var(--text);
          font-size: 14px;
          line-height: 1.5;
        }

        /* Empty state */
        .empty-state {
          border: 2px dashed var(--border);
          border-radius: 14px;
          padding: 40px 24px;
          text-align: center;
          color: var(--text-light);
          background: #fff;
        }
        
        .empty-icon { 
          font-size: 48px; 
          margin-bottom: 16px; 
          opacity: 0.5;
        }
        
        .empty-state h4 {
          margin: 0 0 8px 0;
          color: var(--text);
          font-size: 18px;
          font-weight: 600;
        }
        
        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        /* Buttons */
        .btn {
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .btn-primary {
          background: var(--primary);
          color: white;
        }
        
        .btn-primary:hover {
          background: var(--primary-dark);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        .btn-success {
          background: var(--success);
          color: white;
        }
        
        .btn-success:hover {
          background: var(--success-dark);
        }
        
        .btn-danger {
          background: var(--danger);
          color: white;
        }
        
        .btn-danger:hover {
          background: var(--danger-dark);
        }
        
        .btn-primary.ghost {
          background: transparent;
          color: var(--primary);
          border: 1px solid var(--primary);
        }
        
        .btn-primary.ghost:hover {
          background: var(--primary);
          color: white;
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          backdrop-filter: blur(2px);
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal {
          width: min(600px, 96%);
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 16px;
          padding: 24px;
          background: #fff;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          animation: modalSlideIn 0.3s ease;
        }
        
        @keyframes modalSlideIn {
          from { 
            opacity: 0; 
            transform: scale(0.95) translateY(-20px); 
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }
        
        .btn-close {
          background: transparent;
          border: none;
          font-size: 24px;
          line-height: 1;
          color: var(--text-light);
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s, color 0.2s;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-close:hover {
          background: var(--background);
          color: var(--text);
        }
        
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .modal-body.grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 16px;
        }
        
        @media (max-width: 640px) {
          .modal-body.grid { 
            grid-template-columns: 1fr; 
          }
        }
        
        .modal-meta {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--background);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        
        .meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }
        
        .meta-item:last-child {
          border-bottom: none;
        }
        
        .meta-item.highlight {
          background: rgba(255, 153, 0, 0.05);
          padding: 12px;
          border-radius: 8px;
          border-left: 3px solid #FF9900;
          margin: 4px -12px;
        }
        
        .meta-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .meta-value {
          font-size: 14px;
          color: var(--text);
          font-weight: 500;
        }
        
        .status-approved { color: var(--success); font-weight: 600; }
        .status-rejected { color: var(--danger); font-weight: 600; }
        .status-pending { color: var(--warning); font-weight: 600; }
        
        .double-highlight {
          color: #FF9900;
          font-weight: 600;
          background: rgba(255, 153, 0, 0.1);
          padding: 4px 10px;
          border-radius: 20px;
        }
        
        .justified-highlight {
          color: var(--success);
          font-weight: 600;
          background: rgba(16, 185, 129, 0.1);
          padding: 4px 10px;
          border-radius: 20px;
        }
        
        .modal-section h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .modal-text {
          white-space: pre-wrap;
          line-height: 1.6;
          color: var(--text);
          font-size: 14px;
          background: var(--background);
          padding: 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          margin: 0;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        
        .modal-actions.end { 
          justify-content: flex-end; 
        }

        /* Form fields */
        .form-field, .form-readonly { 
          display: flex; 
          flex-direction: column; 
          gap: 8px; 
        }
        
        .form-field.full { 
          grid-column: 1 / -1; 
        }
        
        .field-label { 
          font-size: 13px; 
          font-weight: 600; 
          color: var(--text); 
        }
        
        .field-input {
          border: 1px solid var(--border);
          background: #fff;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          color: var(--text);
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
        }
        
        .field-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
          outline: none;
        }
        
        .field-input.textarea { 
          resize: vertical; 
          min-height: 140px; 
          line-height: 1.5;
        }
        
        .readonly-box {
          padding: 12px 14px;
          background: var(--background);
          border-radius: 10px;
          font-size: 14px;
          color: var(--text);
          border: 1px dashed var(--border);
        }

        /* Checkbox styles */
        .checkbox-wrapper {
          margin: 8px 0;
        }
        
        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          padding: 12px;
          border-radius: 10px;
          background: var(--card);
          border: 1px solid var(--border);
          transition: all 0.2s ease;
        }
        
        .checkbox-label:hover {
          border-color: var(--primary);
          background: rgba(59, 130, 246, 0.03);
        }
        
        .checkbox-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .checkbox-custom {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: 2px solid var(--border);
          border-radius: 6px;
          background: white;
          transition: all 0.2s ease;
          margin-top: 2px;
          flex-shrink: 0;
        }
        
        .checkbox-input:checked + .checkbox-custom {
          background: var(--primary);
          border-color: var(--primary);
        }
        
        .checkbox-input:checked + .checkbox-custom::after {
          content: '✓';
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        
        .checkbox-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        
        .checkbox-title {
          font-weight: 600;
          color: var(--text);
          font-size: 14px;
        }
        
        .checkbox-description {
          font-size: 13px;
          color: var(--text-light);
          line-height: 1.4;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .card-top {
            flex-direction: column;
            gap: 12px;
          }
          
          .card-actions {
            width: 100%;
            justify-content: flex-start;
          }
          
          .modal {
            padding: 20px;
          }
          
          .modal-header h3 {
            font-size: 18px;
          }
          
          .modal-actions {
            flex-direction: column;
          }
          
          .modal-actions button {
            width: 100%;
          }
          
          .mode-btn {
            font-size: 13px;
            padding: 8px 12px;
          }
        }
        
        @media (max-width: 480px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          
          .filter-dates {
            grid-template-columns: 1fr;
          }
          
          .attendance-card {
            padding: 16px;
          }
          
          .emp-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .status-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default AttendanceAdmin;