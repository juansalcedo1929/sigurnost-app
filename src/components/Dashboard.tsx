import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Employee, Availability } from '../types'

interface DashboardProps {
  employees: Employee[];
  availabilities: Availability[];
  onRefresh: () => void;
}

export default function Dashboard({ employees, availabilities, onRefresh }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState('')

  // Función para obtener la fecha de hoy en formato YYYY-MM-DD
  const getToday = (): string => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Filtrar solo disponibilidades futuras (incluyendo hoy)
  const futureAvailabilities = availabilities.filter(availability => {
    return availability.fecha >= getToday()
  })

  const filteredAvailabilities = selectedDate
    ? futureAvailabilities.filter(a => a.fecha === selectedDate)
    : futureAvailabilities

  const groupedByDate = filteredAvailabilities.reduce((acc: Record<string, Availability[]>, availability) => {
    if (!acc[availability.fecha]) {
      acc[availability.fecha] = []
    }
    acc[availability.fecha].push(availability)
    return acc
  }, {})

  const deleteAvailability = async (id: string): Promise<void> => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      const { error } = await supabase
        .from('availabilities')
        .delete()
        .eq('id', id)
      
      if (!error) {
        onRefresh()
      }
    }
  }

  // Función mejorada para formatear fechas
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const isToday = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()
    
    if (isToday) {
      return `📅 Hoy - ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`
    } else if (isTomorrow) {
      return `📅 Mañana - ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`
    } else {
      return `📅 ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`
    }
  }

  // Ordenar fechas en orden ascendente (más cercanas primero)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  )

  // Obtener la fecha mínima para el input (hoy)
  const minDate = getToday()

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <h2>📊 Dashboard de Disponibilidad</h2>
        
        <div className="filter-section">
          <div className="filter-row">
            <div className="filter-group">
              <label>Filtrar por fecha específica:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={minDate}
              />
            </div>
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate('')}
                className="btn btn-danger"
                style={{ width: 'auto', padding: '12px 16px' }}
              >
                🗑️ Limpiar
              </button>
            )}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-light)', marginTop: '8px' }}>
            {selectedDate ? 
              `Mostrando disponibilidad para el ${formatDate(selectedDate).replace('📅 ', '')}` : 
              `Mostrando ${futureAvailabilities.length} disponibilidades futuras`
            }
          </div>
        </div>

        <div className="availability-list">
          {sortedDates.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📅</div>
              <h3>No hay disponibilidades futuras</h3>
              <p>No hay registros de disponibilidad para fechas futuras</p>
              {availabilities.length > 0 && (
                <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-light)' }}>
                  Hay {availabilities.length - futureAvailabilities.length} registros de fechas pasadas que no se muestran
                </div>
              )}
            </div>
          ) : (
            sortedDates.map(fecha => (
              <div key={fecha} className="date-section">
                <h3 className="date-title">
                  {formatDate(fecha)}
                </h3>
                
                <div className="availability-items">
                  {groupedByDate[fecha].map(availability => (
                    <div 
                      key={availability.id} 
                      className={`availability-item ${
                        availability.disponible ? '' : 'unavailable'
                      }`}
                    >
                      <div className="availability-info">
                        <div className="employee-name">
                          {availability.employees?.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className={`availability-status ${
                            availability.disponible ? 'status-available' : 'status-unavailable'
                          }`}>
                            {availability.disponible ? '✅ Disponible' : '❌ No disponible'}
                          </div>
                     
                        </div>
                      </div>
                <button 
                    onClick={() => deleteAvailability(availability.id)}
                    className="btn-delete"
                    title="Eliminar registro"
                    >
                    <span className="icon-delete"></span>
                    Eliminar
                    </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Información adicional */}
      {futureAvailabilities.length > 0 && (
        <div style={{ 
          background: 'var(--card)', 
          padding: '16px', 
          borderRadius: '12px', 
          border: '1px solid var(--border)',
          fontSize: '14px',
          color: 'var(--text-light)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Resumen:</strong> {futureAvailabilities.length} disponibilidades futuras
            </div>
            <div>
              <strong>Empleados:</strong> {new Set(futureAvailabilities.map(a => a.employee_id)).size}
            </div>
            <div>
              <strong>Fechas:</strong> {sortedDates.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}