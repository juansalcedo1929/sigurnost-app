// src/components/AvailabilityForm.tsx
'use client';
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Employee, Availability, User } from '../types'
import Calendar from './Calendar'
import { AuthService } from '../lib/auth'

interface AvailabilityFormProps {
  employees: Employee[];
  selectedEmployee: string | null;
  onEmployeeChange: (employeeId: string) => void;
  onAvailabilityAdded: () => void;
  availabilities: Availability[];
}

export default function AvailabilityForm({ 
  employees, 
  selectedEmployee, 
  onEmployeeChange, 
  onAvailabilityAdded,
  availabilities 
}: AvailabilityFormProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [disponible, setDisponible] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    setCurrentUser(user)
    
    // Si es empleado, auto-seleccionar su empleado_id
    if (user?.role === 'employee' && user.employee_id) {
      onEmployeeChange(user.employee_id)
    }
  }, [onEmployeeChange])

  // Función para validar duplicados
  const checkForDuplicates = (): string[] => {
    const employeeId = currentUser?.role === 'employee' ? currentUser.employee_id : selectedEmployee
    if (!employeeId) return []
    
    const duplicates: string[] = []
    
    selectedDates.forEach(date => {
      const existingRecord = availabilities.find(
        a => a.employee_id === employeeId && a.fecha === date
      )
      
      if (existingRecord) {
        duplicates.push(date)
      }
    })
    
    return duplicates
  }

  // Función para formatear fecha
  const formatDate = (dateString: string): string => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    const employeeId = currentUser?.role === 'employee' ? currentUser.employee_id : selectedEmployee
    
    if (!employeeId) {
      alert('❌ No se puede determinar el empleado')
      return
    }

    if (selectedDates.length === 0) {
      alert('❌ Por favor selecciona al menos una fecha')
      return
    }

    // Validar duplicados
    const duplicates = checkForDuplicates()
    if (duplicates.length > 0) {
      const duplicateDates = duplicates.map(formatDate).join(', ')
      alert(`❌ No se puede registrar para las siguientes fechas porque ya existen registros:\n\n${duplicateDates}\n\nPor favor elimina los registros existentes primero o selecciona otras fechas.`)
      return
    }

    // Ordenar fechas para mejor visualización
    const sortedDates = [...selectedDates].sort()

    setLoading(true)

    // Crear registros para cada fecha seleccionada
    const records = sortedDates.map(date => ({
      employee_id: employeeId,
      fecha: date,
      disponible
    }))

    const { error } = await supabase
      .from('availabilities')
      .insert(records)

    setLoading(false)
    
    if (!error) {
      const employeeName = employees.find(emp => emp.id === employeeId)?.name || 
                          (currentUser?.role === 'employee' ? 'Tu cuenta' : 'Empleado')
      
      setSelectedDates([])
      setDisponible(true)
      setShowCalendar(false)
      onAvailabilityAdded()
      
      alert(`✅ Disponibilidad registrada exitosamente para ${employeeName}\n\nFechas: ${sortedDates.length}\nEstado: ${disponible ? 'Disponible' : 'No disponible'}`)
    } else {
      console.error('Error detallado:', error)
      alert('❌ Error al registrar disponibilidad: ' + error.message)
    }
  }

  const clearSelection = () => {
    setSelectedDates([])
  }

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedDates([])
    onEmployeeChange(employeeId)
  }

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar)
  }

  const getCurrentEmployeeName = (): string => {
    if (currentUser?.role === 'employee') {
      return employees.find(emp => emp.id === currentUser.employee_id)?.name || 'Tu cuenta'
    }
    return employees.find(emp => emp.id === selectedEmployee)?.name || 'No seleccionado'
  }

  // Función para obtener el employeeId correcto para el Calendar
  const getCalendarEmployeeId = (): string | null => {
    if (currentUser?.role === 'employee') {
      return currentUser.employee_id || null;
    }
    return selectedEmployee;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <h2>📅 Registrar Disponibilidad</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Selector de empleado solo para admin */}
          {currentUser?.role === 'admin' ? (
            <div className="form-group">
              <label>Seleccionar Empleado:</label>
              <select 
                value={selectedEmployee || ''} 
                onChange={(e) => handleEmployeeChange(e.target.value)}
                required
              >
                <option value="">-- Elegir empleado --</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Empleado:</label>
              <div style={{ 
                padding: '12px 16px', 
                background: 'var(--card)', 
                borderRadius: '12px',
                border: '1px solid var(--border)',
                fontWeight: '600',
                color: 'var(--text)'
              }}>
                {getCurrentEmployeeName()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                Registrando disponibilidad para tu cuenta
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Estado de Disponibilidad:</label>
            <select 
              value={disponible ? 'available' : 'unavailable'} 
              onChange={(e) => setDisponible(e.target.value === 'available')}
              required
            >
              <option value="available">✅ Disponible para trabajar</option>
              <option value="unavailable">❌ No disponible</option>
            </select>
          </div>

          {/* Selector de calendario mejorado */}
          <div className="form-group">
            <label>Seleccionar Fechas:</label>
            <div 
              className="calendar-selector"
              onClick={toggleCalendar}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>
                    {selectedDates.length > 0 ? `${selectedDates.length} fecha(s) seleccionada(s)` : 'Toca para seleccionar fechas'}
                  </div>
                  {selectedDates.length > 0 && (
                    <div style={{ fontSize: '14px', color: 'var(--text-light)', marginTop: '4px' }}>
                      {selectedDates.slice(0, 3).map(date => formatDate(date)).join(', ')}
                      {selectedDates.length > 3 && ` y ${selectedDates.length - 3} más`}
                    </div>
                  )}
                </div>
                <div style={{ 
                  background: 'var(--primary)', 
                  color: 'white', 
                  borderRadius: '8px', 
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {showCalendar ? '▲ Ocultar' : '▼ Mostrar Calendario'}
                </div>
              </div>
            </div>
          </div>

          {/* Calendario que se muestra/oculta */}
          {showCalendar && (
            <div style={{ background: 'var(--card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <Calendar 
                onDatesChange={setSelectedDates}
                selectedDates={selectedDates}
                employeeId={getCalendarEmployeeId()}
                existingAvailabilities={availabilities}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button 
              type="submit" 
              disabled={loading || selectedDates.length === 0} 
              className="btn btn-success"
              style={{ opacity: (loading || selectedDates.length === 0) ? 0.6 : 1 }}
            >
              {loading ? (
                <>
                  <span>⏳</span>
                  Registrando...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Registrar para {selectedDates.length} fecha(s)
                </>
              )}
            </button>
            
            {selectedDates.length > 0 && (
              <button 
                type="button" 
                onClick={clearSelection} 
                className="btn btn-danger"
              >
                <span>🗑️</span>
                Limpiar {selectedDates.length} selección(es)
              </button>
            )}
          </div>
        </form>

        {selectedDates.length > 0 && (
          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Resumen de Registro
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px', fontSize: '14px' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-light)' }}>Empleado:</div>
              <div>{getCurrentEmployeeName()}</div>
              
              <div style={{ fontWeight: '600', color: 'var(--text-light)' }}>Estado:</div>
              <div style={{ color: disponible ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                {disponible ? '✅ Disponible' : '❌ No disponible'}
              </div>
              
              <div style={{ fontWeight: '600', color: 'var(--text-light)' }}>Fechas:</div>
              <div>
                <div style={{ marginBottom: '8px' }}>{selectedDates.length} fecha(s) seleccionada(s)</div>
                <div className="selected-dates-container">
                  {[...selectedDates].sort().map(date => (
                    <div key={date} style={{
                      background: 'var(--primary)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {formatDate(date)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}