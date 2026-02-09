import { useState } from 'react'
import { Availability } from '../types'

interface CalendarProps {
  onDatesChange: (dates: string[]) => void
  selectedDates: string[]
  employeeId: string | null
  existingAvailabilities: Availability[]
}

export default function Calendar({ onDatesChange, selectedDates, employeeId, existingAvailabilities }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const today = new Date()
  const todayString = today.toISOString().split('T')[0]
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const startingDay = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  // Función para verificar si una fecha es pasada
  const isPastDate = (dateString: string): boolean => {
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Función para verificar si una fecha ya está registrada
  const isDateRegistered = (dateString: string): boolean => {
    if (!employeeId) return false
    
    return existingAvailabilities.some(
      availability => 
        availability.employee_id === employeeId && 
        availability.fecha === dateString
    )
  }

  const handleDateClick = (date: string, e: React.MouseEvent) => {
    e.preventDefault() // Prevenir cualquier comportamiento por defecto
    e.stopPropagation() // Detener la propagación
    
    // No permitir seleccionar fechas pasadas
    if (isPastDate(date)) {
      return
    }

    // Verificar si la fecha ya está seleccionada
    const isSelected = selectedDates.includes(date)
    
    let newSelectedDates: string[]
    
    if (isSelected) {
      // Si ya está seleccionada, la removemos
      newSelectedDates = selectedDates.filter(d => d !== date)
    } else {
      // Si no está seleccionada, la agregamos
      newSelectedDates = [...selectedDates, date]
    }
    
    onDatesChange(newSelectedDates)
  }

  const generateCalendarDays = () => {
    const days = []
    
    // Días del mes anterior
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startingDay - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i)
      days.push({
        date: date.toISOString().split('T')[0],
        day: prevMonthLastDay - i,
        isCurrentMonth: false
      })
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      days.push({
        date: date.toISOString().split('T')[0],
        day,
        isCurrentMonth: true
      })
    }

    // Días del próximo mes
    const totalCells = 42
    const nextMonthDays = totalCells - days.length
    for (let day = 1; day <= nextMonthDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day)
      days.push({
        date: date.toISOString().split('T')[0],
        day,
        isCurrentMonth: false
      })
    }

    return days
  }

  const goToPreviousMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentDate(new Date())
  }

  const clearAllDates = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDatesChange([])
  }

  // Función para determinar si un día debe estar deshabilitado
  const isDayDisabled = (date: string, isCurrentMonth: boolean): boolean => {
    // Si no es del mes actual, siempre está habilitado (para meses futuros)
    if (!isCurrentMonth) {
      return isPastDate(date) || isDateRegistered(date)
    }
    // Si es del mes actual, verificar si es pasado o registrado
    return isPastDate(date) || isDateRegistered(date)
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h3 className="font-semibold text-lg">
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <div className="calendar-nav">
          <button 
            onClick={goToPreviousMonth} 
            className="calendar-nav-btn"
            type="button"
          >
            ‹
          </button>
          <button 
            onClick={goToToday} 
            className="calendar-nav-btn"
            type="button"
          >
            Hoy
          </button>
          <button 
            onClick={goToNextMonth} 
            className="calendar-nav-btn"
            type="button"
          >
            ›
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '12px', fontSize: '14px', color: 'var(--text-light)' }}>
        👆 Selecciona fechas futuras
      </div>

      <div className="calendar-grid">
        {dayNames.map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        {generateCalendarDays().map(({ date, day, isCurrentMonth }) => {
          const isToday = date === todayString
          const isSelected = selectedDates.includes(date)
          const isPast = isPastDate(date)
          const isRegistered = isDateRegistered(date)
          const isDisabled = isDayDisabled(date, isCurrentMonth)
          
          return (
            <button
              key={date}
              className={`calendar-day ${
                !isCurrentMonth ? 'other-month' : ''
              } ${
                isSelected ? 'selected' : ''
              } ${
                isToday ? 'today' : ''
              } ${
                isPast ? 'past-day' : ''
              } ${
                isRegistered ? 'registered-day' : ''
              }`}
              onClick={(e) => handleDateClick(date, e)}
              disabled={isDisabled}
              type="button"
              title={
                isPast ? "No puedes seleccionar fechas pasadas" : 
                isRegistered ? "Fecha ya registrada para este empleado" : 
                isCurrentMonth ? "Seleccionar fecha" :
                "Fecha de otro mes - Puedes seleccionar"
              }
            >
              {day}
              {isRegistered && <div style={{ fontSize: '8px', marginTop: '2px' }}>✅</div>}            </button>
          )
        })}
      </div>
      
      <div className="text-center text-sm mt-4" style={{ color: 'var(--text-light)' }}>
        <strong>{selectedDates.length}</strong> fecha(s) seleccionada(s)
        {selectedDates.length > 0 && (
          <button 
            onClick={clearAllDates}
            type="button"
            style={{ 
              marginLeft: '12px', 
              background: 'var(--danger)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Leyenda del calendario */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: 'var(--card)', 
        borderRadius: '8px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>
          Leyenda del calendario:
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px', 
          fontSize: '11px', 
          color: 'var(--text-light)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: 'var(--primary)', 
              borderRadius: '2px' 
            }}></div>
            <span>Día seleccionado</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: 'var(--danger)', 
              borderRadius: '2px', 
              opacity: 0.3 
            }}></div>
            <span>Fecha pasada</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: 'var(--success)', 
              borderRadius: '2px' 
            }}></div>
            <span>Ya registrado</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: 'var(--border)', 
              borderRadius: '2px' 
            }}></div>
            <span>Día disponible</span>
          </div>
         
         
        </div>
      </div>

      {/* Mostrar fechas seleccionadas para mejor visibilidad */}
      {selectedDates.length > 0 && (
        <div style={{ 
          marginTop: '12px', 
          padding: '12px', 
          background: 'var(--background)', 
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>
            Fechas seleccionadas:
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '4px',
            maxHeight: '60px',
            overflowY: 'auto',
            padding: '4px'
          }}>
            {[...selectedDates].sort().map(date => (
              <div 
                key={date}
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '500'
                }}
              >
                {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short'
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}