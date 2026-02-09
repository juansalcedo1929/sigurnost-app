// src/components/UserManagement.tsx
'use client';
import { useState, useEffect } from 'react';
import { AuthService } from '../lib/auth';
import { User, Employee } from '../types';

interface UserManagementProps {
  employees: Employee[];
  onUsersUpdated: () => void;
}

export default function UserManagement({ employees, onUsersUpdated }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'employee' as 'admin' | 'employee',
    employee_id: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const usersList = await AuthService.getUsers();
    setUsers(usersList);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await AuthService.createUser(formData);
    
    if (result.success) {
      setFormData({
        username: '',
        password: '',
        role: 'employee',
        employee_id: ''
      });
      setShowForm(false);
      await loadUsers();
      onUsersUpdated();
      alert('✅ Usuario creado exitosamente');
    } else {
      alert('❌ Error: ' + result.error);
    }
    
    setIsLoading(false);
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (confirm(`¿Estás seguro de eliminar al usuario "${username}"?`)) {
      const result = await AuthService.deleteUser(userId);
      
      if (result.success) {
        await loadUsers();
        onUsersUpdated();
        alert('✅ Usuario eliminado');
      } else {
        alert('❌ Error: ' + result.error);
      }
    }
  };

  const availableEmployees = employees.filter(employee => 
    !users.some(user => user.employee_id === employee.id)
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>👥 Gestión de Usuarios</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn"
          style={{ width: 'auto', padding: '10px 16px' }}
        >
          {showForm ? '❌ Cancelar' : '➕ Nuevo Usuario'}
        </button>
      </div>

      {showForm && (
        <div style={{ 
          background: 'var(--card)', 
          padding: '20px', 
          borderRadius: '12px', 
          border: '1px solid var(--border)',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '16px' }}>Crear Nuevo Usuario</h3>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label>Nombre de usuario:</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Ingresa el nombre de usuario"
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña:</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Ingresa la contraseña"
                required
              />
            </div>

            <div className="form-group">
              <label>Rol:</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'employee' })}
                required
              >
                <option value="employee">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {formData.role === 'employee' && (
              <div className="form-group">
                <label>Asignar a empleado:</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required={formData.role === 'employee'}
                >
                  <option value="">-- Seleccionar empleado --</option>
                  {availableEmployees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.email}
                    </option>
                  ))}
                </select>
                {availableEmployees.length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                    No hay empleados disponibles para asignar
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={isLoading}
                className="btn btn-success"
                style={{ flex: 1 }}
              >
                {isLoading ? '⏳ Creando...' : '💾 Crear Usuario'}
              </button>
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-danger"
                style={{ width: 'auto' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="employees-list">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>⏳ Cargando usuarios...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👥</div>
            <h3>No hay usuarios registrados</h3>
            <p>Crea el primer usuario del sistema</p>
          </div>
        ) : (
          users.map(user => (
            <div key={user.id} className="employee-item">
              <div className="employee-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <strong>{user.username}</strong>
                  <span 
                    style={{ 
                      background: user.role === 'admin' ? 'var(--primary)' : 'var(--secondary)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  >
                    {user.role === 'admin' ? 'Administrador' : 'Empleado'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                  {user.employee ? (
                    <>Asignado a: {user.employee.name}</>
                  ) : (
                    <>Usuario administrativo</>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                  Creado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>
              
              {user.username !== 'admin' && ( // No permitir eliminar al admin principal
        <button 
            onClick={() => handleDeleteUser(user.id, user.username)}
            className="btn-delete"
            title="Eliminar usuario"
            >
            <span className="icon-delete"></span>
            Eliminar
        </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}