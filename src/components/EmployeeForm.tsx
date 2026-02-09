// src/components/EmployeeForm.tsx - VERSIÓN COMPLETA CON EDICIÓN
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthService } from '../lib/auth';
import { Employee } from '../types';
import UserManagement from './UserManagement';

interface EmployeeFormProps {
  onEmployeeAdded: () => void;
  employees: Employee[];
  onUsersUpdated?: () => void;
}

export default function EmployeeForm({ onEmployeeAdded, employees, onUsersUpdated }: EmployeeFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [salary, setSalary] = useState<string>('')
  const [createUser, setCreateUser] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('employees')
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    // Resetear formulario cuando se cambia de sección
    if (activeSection === 'employees') {
      resetForm();
    }
  }, [activeSection]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setSalary('');
    setCreateUser(false);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setEditingEmployee(null);
    setShowEditModal(false);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validar salario
      const salaryValue = salary ? parseFloat(salary) : 0;
      if (salaryValue < 0) {
        alert('❌ El salario no puede ser negativo');
        setLoading(false);
        return;
      }

      // Validar que las contraseñas coincidan si se está creando usuario
      if (createUser) {
        if (password !== confirmPassword) {
          alert('❌ Las contraseñas no coinciden')
          setLoading(false)
          return
        }
        if (password.length < 3) {
          alert('❌ La contraseña debe tener al menos 3 caracteres')
          setLoading(false)
          return
        }
      }

      // Paso 1: Crear el empleado
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert([{ 
          name, 
          email, 
          salary: salaryValue 
        }])
        .select()
        .single()

      if (employeeError) {
        console.error('Error creando empleado:', employeeError)
        alert('❌ Error al agregar empleado: ' + employeeError.message)
        setLoading(false)
        return
      }

      // Paso 2: Si se marcó crear usuario, crear el usuario asociado
      if (createUser && employeeData) {
        const userResult = await AuthService.createUser({
          username: username || email.split('@')[0],
          password: password,
          role: 'employee',
          employee_id: employeeData.id
        })

        if (!userResult.success) {
          console.error('Error creando usuario:', userResult.error)
          alert('✅ Empleado creado, pero error al crear usuario: ' + userResult.error)
          // No hacemos return aquí para que al menos se cree el empleado
        }
      }

      // Limpiar formulario
      resetForm();
      
      onEmployeeAdded()
      if (createUser && onUsersUpdated) {
        onUsersUpdated()
      }
      
      alert(createUser ? '✅ Empleado y usuario creados exitosamente' : '✅ Empleado creado exitosamente')
      
    } catch (error) {
      console.error('Error inesperado:', error)
      alert('❌ Error inesperado al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setLoading(true);
    try {
      const salaryValue = editingEmployee.salary || 0;
      if (salaryValue < 0) {
        alert('❌ El salario no puede ser negativo');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('employees')
        .update({
          name: editingEmployee.name,
          email: editingEmployee.email,
          salary: salaryValue
        })
        .eq('id', editingEmployee.id);

      if (error) {
        console.error('Error actualizando empleado:', error);
        alert('❌ Error al actualizar empleado: ' + error.message);
      } else {
        alert('✅ Empleado actualizado exitosamente');
        setShowEditModal(false);
        setEditingEmployee(null);
        onEmployeeAdded();
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      alert('❌ Error inesperado al actualizar empleado');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`¿Estás seguro de eliminar al empleado "${employeeName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      // Primero verificar si el empleado tiene asistencias o disponibilidades
      const { data: attendances } = await supabase
        .from('attendances')
        .select('id')
        .eq('employee_id', employeeId)
        .limit(1);

      const { data: availabilities } = await supabase
        .from('availabilities')
        .select('id')
        .eq('employee_id', employeeId)
        .limit(1);

      if (attendances && attendances.length > 0) {
        alert('❌ No se puede eliminar el empleado porque tiene registros de asistencia');
        return;
      }

      if (availabilities && availabilities.length > 0) {
        alert('❌ No se puede eliminar el empleado porque tiene registros de disponibilidad');
        return;
      }

      // Eliminar usuario asociado si existe
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('employee_id', employeeId)
        .single();

      if (user) {
        await AuthService.deleteUser(user.id);
      }

      // Eliminar empleado
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) {
        alert('❌ Error al eliminar empleado: ' + error.message);
      } else {
        alert('✅ Empleado eliminado exitosamente');
        onEmployeeAdded();
      }
    } catch (error) {
      console.error('Error eliminando empleado:', error);
      alert('❌ Error al eliminar empleado');
    }
  };

  const generateUsername = (email: string) => {
    if (!username || username === email.split('@')[0]) {
      setUsername(email.split('@')[0]);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Selector de sección */}
      <div className="card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '0' }}>
          <button
            className={`btn ${activeSection === 'employees' ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setActiveSection('employees')}
            style={{ flex: 1 }}
          >
            👥 Gestión de Empleados
          </button>
          <button
            className={`btn ${activeSection === 'users' ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setActiveSection('users')}
            style={{ flex: 1 }}
          >
            🔐 Gestión de Usuarios
          </button>
        </div>
      </div>

      {activeSection === 'employees' ? (
        <>
          {/* Formulario para agregar empleado */}
          <div className="card">
            <h2>👥 Agregar Empleado</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label>Nombre completo:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ingresa el nombre completo"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    generateUsername(e.target.value);
                  }}
                  placeholder="Ingresa el email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Salario diario (MXN):</label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="Ej: 500.00"
                  step="0.01"
                  min="0"
                />
                {salary && (
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                    {formatCurrency(salary)} por día
                  </div>
                )}
              </div>

              {/* Opción para crear usuario */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={createUser}
                    onChange={(e) => setCreateUser(e.target.checked)}
                  />
                  <span style={{ fontWeight: '600' }}>Crear usuario de sistema para este empleado</span>
                </label>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                  El empleado podrá acceder al sistema con su usuario y contraseña
                </div>
              </div>

              {createUser && (
                <div style={{ 
                  background: 'var(--card)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border)'
                }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>🔐 Crear Usuario del Sistema</h3>
                  
                  <div className="form-group">
                    <label>Nombre de usuario:</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nombre de usuario para login"
                      required
                    />
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                      Se generó automáticamente desde el email. Puedes personalizarlo.
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Contraseña:</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa la contraseña"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirmar Contraseña:</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirma la contraseña"
                      required
                    />
                    {password && confirmPassword && password !== confirmPassword && (
                      <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                        ❌ Las contraseñas no coinciden
                      </div>
                    )}
                    {password && confirmPassword && password === confirmPassword && (
                      <div style={{ color: 'var(--success)', fontSize: '12px', marginTop: '4px' }}>
                        ✅ Las contraseñas coinciden
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <button type="submit" disabled={loading} className="btn">
                {loading ? (
                  <>⏳ Procesando...</>
                ) : createUser ? (
                  <>👥➕ Crear Empleado y Usuario</>
                ) : (
                  <>👥 Crear Solo Empleado</>
                )}
              </button>
            </form>
          </div>

          {/* Lista de empleados con opción de editar */}
          <div className="card">
            <h2>📋 Empleados Registrados ({employees.length})</h2>
            <div className="employees-list">
              {employees.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">👥</div>
                  <h3>No hay empleados</h3>
                  <p>Agrega el primer empleado</p>
                </div>
              ) : (
                employees.map(employee => (
                  <div key={employee.id} className="employee-item">
                    <div className="employee-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ display: 'block', marginBottom: '2px' }}>{employee.name}</strong>
                          <span style={{ fontSize: '14px', color: 'var(--text-light)' }}>{employee.email}</span>
                        </div>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '12px'
                      }}>
                        <div style={{ 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          color: 'var(--success)',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          {formatCurrency(employee.salary || 0)} / día
                        </div>
                        
                        <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                          Registrado: {employee.created_at ? new Date(employee.created_at).toLocaleDateString('es-ES') : 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="employee-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleEditEmployee(employee)}
                        className="btn-icon"
                        style={{ 
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        ✏️ Editar
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                        className="btn-icon"
                        style={{ 
                          background: 'var(--danger)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <UserManagement 
          employees={employees} 
          onUsersUpdated={onUsersUpdated || (() => {})} 
        />
      )}

      {/* Modal para editar empleado */}
      {showEditModal && editingEmployee && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>✏️ Editar Empleado</h3>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)} 
                className="btn-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="modal-body">
              <div className="form-group">
                <label>Nombre completo:</label>
                <input
                  type="text"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})}
                  placeholder="Ingresa el nombre completo"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingEmployee.email || ''}
                  onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                  placeholder="Ingresa el email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Salario diario (MXN):</label>
                <input
                  type="number"
                  value={editingEmployee.salary || ''}
                  onChange={(e) => setEditingEmployee({...editingEmployee, salary: parseFloat(e.target.value) || 0})}
                  placeholder="Ej: 500.00"
                  step="0.01"
                  min="0"
                  required
                />
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                  {formatCurrency(editingEmployee.salary || 0)} por día
                </div>
              </div>

              <div style={{ 
                marginTop: '20px',
                padding: '12px',
                background: 'var(--background)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-light)'
              }}>
                <strong>📝 Nota:</strong> Los cambios se aplicarán inmediatamente a todos los reportes futuros de nómina.
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="btn btn-success"
                  style={{ flex: 1 }}
                >
                  {loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estilos adicionales */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          backdrop-filter: blur(4px);
        }
        
        .modal {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          animation: modalSlideIn 0.3s ease;
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: var(--text);
        }
        
        .btn-close {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--text-light);
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }
        
        .btn-close:hover {
          background: var(--background);
          color: var(--text);
        }
        
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        
        @media (max-width: 480px) {
          .modal {
            padding: 20px;
          }
          
          .modal-header h3 {
            font-size: 18px;
          }
          
          .employee-actions {
            flex-direction: column;
            width: 100%;
          }
          
          .employee-actions button {
            width: 100%;
            justify-content: center;
          }
          
          .employee-item {
            flex-direction: column;
            align-items: stretch;
          }
          
          .employee-actions {
            margin-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}