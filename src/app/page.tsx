// src/app/page.tsx - VERSIÓN SIMPLIFICADA CON NÓMINA
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import EmployeeForm from '../components/EmployeeForm'
import AvailabilityForm from '../components/AvailabilityForm'
import Dashboard from '../components/Dashboard'
import LoginForm from '../components/LoginForm'
import EmployeeDashboard from '../components/EmployeeDashboard'
import { AuthService } from '../lib/auth'
import { Employee, Availability as AvailabilityType, User } from '../types'
import { Attendance } from '../components/Attendance'
import { AttendanceAdmin } from '../components/AttendanceAdmin'
import PayrollReport from '../components/PayrollReport'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [availabilities, setAvailabilities] = useState<AvailabilityType[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth();
    fetchEmployees();
    fetchAvailabilities();
  }, [])

  const checkAuth = () => {
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }

  const fetchEmployees = async (): Promise<void> => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name')
    
    if (!error && data) {
      setEmployees(data)
    }
  }

  const fetchAvailabilities = async (): Promise<void> => {
    const { data, error } = await supabase
      .from('availabilities')
      .select(`
        *,
        employees (name, email)
      `)
      .order('fecha', { ascending: false })
    
    if (!error && data) {
      setAvailabilities(data as AvailabilityType[])
    }
  }

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  }

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
    setActiveTab('dashboard');
  }

  const renderActiveTab = () => {
    
    // Si es empleado, mostrar dashboard personalizado
    if (user?.role === 'employee') {
      switch (activeTab) {
        case 'dashboard':
          return <EmployeeDashboard user={user} />
        case 'availability':
          return (
            <AvailabilityForm 
              employees={employees.filter(emp => emp.id === user.employee_id)}
              selectedEmployee={user.employee_id || null}
              onEmployeeChange={() => {}}
              onAvailabilityAdded={fetchAvailabilities}
              availabilities={availabilities}
            />
          )
        case 'attendance':
          return <Attendance />
        default:
          return <EmployeeDashboard user={user} />
      }
    }

    // Si es admin, mostrar todas las funcionalidades
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            employees={employees}
            availabilities={availabilities}
            onRefresh={fetchAvailabilities}
          />
        )
      case 'employees':
        return (
          <EmployeeForm 
            onEmployeeAdded={fetchEmployees}
            employees={employees}
          />
        )
      case 'availability':
        return (
          <AvailabilityForm 
            employees={employees}
            selectedEmployee={selectedEmployee}
            onEmployeeChange={setSelectedEmployee}
            onAvailabilityAdded={fetchAvailabilities}
            availabilities={availabilities}
          />
        )
      case 'attendance':
        return <AttendanceAdmin />
      case 'payroll': // NUEVA PESTAÑA
        return <PayrollReport />
      default:
        return null
    }
  }

  const renderNavigation = () => {
    if (user?.role === 'employee') {
      // NAVEGACIÓN PARA EMPLEADOS
      return (
        <>
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-text">Registrar</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <span className="nav-icon">✅</span>
            <span className="nav-text">Asistencias</span>
          </button>
        </>
      );
    }

    // NAVEGACIÓN PARA ADMINISTRADORES
    return (
      <>
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-text">Dashboard</span>
        </button>
        
        <button 
          className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          <span className="nav-icon">👥</span>
          <span className="nav-text">Empleados</span>
        </button>
        
        <button 
          className={`nav-item ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          <span className="nav-icon">📅</span>
          <span className="nav-text">Registrar</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <span className="nav-icon">✅</span>
          <span className="nav-text">Asistencias</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'payroll' ? 'active' : ''}`}
          onClick={() => setActiveTab('payroll')}
        >
          <span className="nav-icon">💰</span>
          <span className="nav-text">Nómina</span>
        </button>
      </>
    )
  }

  if (isLoading) {
    return (
      <div className="app-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>⏳ Cargando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>Sigurnost</h1>
            <p>
              {user.role === 'admin' ? 'Gestión de Disponibilidad' : 'Mi Disponibilidad'}
              {user.role === 'admin' && ' - Administrador'}
            </p>
          </div>
          
          <div className="user-info">
            <div className="user-details">
              <div className="user-name">{user.username}</div>
              <div className="user-role">
                {user.role === 'admin' ? 'Administrador' : 'Empleado'}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="btn-logout"
              title="Cerrar sesión"
            >
              <span className="icon-logout"></span>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {renderActiveTab()}
      </main>

      <nav className="bottom-nav">
        {renderNavigation()}
      </nav>
    </div>
  )
}