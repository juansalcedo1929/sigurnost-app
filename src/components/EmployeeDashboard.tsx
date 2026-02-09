import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Availability, Employee, User } from '../types';

interface EmployeeDashboardProps {
  user: User;
}

export default function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeData();
  }, [user]);

  // Función para obtener la fecha de hoy en formato YYYY-MM-DD
  const getToday = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const fetchEmployeeData = async () => {
    try {
      // Obtener información del empleado
      if (user.employee_id) {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .eq('id', user.employee_id)
          .single();
        
        setEmployee(employeeData);
      }

      // Obtener todas las disponibilidades del empleado actual
      const { data: availabilityData } = await supabase
        .from('availabilities')
        .select('*')
        .eq('employee_id', user.employee_id)
        .order('fecha', { ascending: true });

      // Filtrar solo las disponibilidades futuras (incluyendo hoy)
      const futureAvailabilities = (availabilityData || []).filter(availability => {
        return availability.fecha >= getToday();
      });

      setAvailabilities(futureAvailabilities);
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para eliminar disponibilidad - EXACTA AL ADMIN
  const deleteAvailability = async (id: string): Promise<void> => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      const { error } = await supabase
        .from('availabilities')
        .delete()
        .eq('id', id)
      
      if (!error) {
        setAvailabilities(prev => prev.filter(avail => avail.id !== id));
      }
    }
  };

  // Función mejorada para formatear fechas - EXACTA AL ADMIN
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) {
      return `📅 Hoy - ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`;
    } else if (isTomorrow) {
      return `📅 Mañana - ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`;
    } else {
      return `📅 ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`;
    }
  };

  // Agrupar por fecha - EXACTO AL ADMIN
  const groupedByDate = availabilities.reduce((acc: Record<string, Availability[]>, availability) => {
    if (!acc[availability.fecha]) {
      acc[availability.fecha] = [];
    }
    acc[availability.fecha].push(availability);
    return acc;
  }, {});

  // Ordenar fechas en orden ascendente - EXACTO AL ADMIN
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  if (isLoading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>⏳ Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <h2>👋 Hola, {employee?.name || user.username}</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '16px' }}>
          Esta es tu vista personal de disponibilidad
        </p>
        
        {employee && (
          <div style={{ 
            background: 'var(--background)', 
            padding: '16px', 
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-light)' }}>Nombre:</div>
              <div>{employee.name}</div>
              
              <div style={{ fontWeight: '600', color: 'var(--text-light)' }}>Email:</div>
              <div>{employee.email}</div>
              
              <div style={{ fontWeight: '600', color: 'var(--text-light)' }}>Rol:</div>
              <div>
                <span style={{ 
                  background: 'var(--primary)', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {user.role === 'admin' ? 'Administrador' : 'Empleado'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>📅 Mis Disponibilidades</h2>
        
        {availabilities.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📅</div>
            <h3>No hay disponibilidades futuras registradas</h3>
            <p>Ve a la pestaña "Registrar" para registrar tus días disponibles</p>
          </div>
        ) : (
          <div>
            <div style={{ 
              background: 'var(--card)', 
              padding: '12px 16px', 
              borderRadius: '8px',
              border: '1px solid var(--border)',
              marginBottom: '16px',
              fontSize: '14px',
              color: 'var(--text-light)'
            }}>
              <strong>Resumen:</strong> Tienes {availabilities.length} registros de disponibilidad
            </div>
            
            <div className="availability-list">
              {sortedDates.map(fecha => (
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
                            {employee?.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className={`availability-status ${
                              availability.disponible ? 'status-available' : 'status-unavailable'
                            }`}>
                              {availability.disponible ? '✅ Disponible' : '❌ No disponible'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                              {employee?.email}
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
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Información adicional - EXACTA AL ADMIN */}
      {availabilities.length > 0 && (
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
              <strong>Resumen:</strong> {availabilities.length} disponibilidades futuras
            </div>
            <div>
              <strong>Fechas:</strong> {sortedDates.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}