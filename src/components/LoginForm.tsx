// src/components/LoginForm.tsx
'use client';
import { useState } from 'react';
import { AuthService } from '../lib/auth';
import { User } from '../types';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await AuthService.login(username, password);
      
      if (user) {
        onLogin(user);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Por favor, intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header limpio y profesional */}
      <header className="header" style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
        <div className="header-content">
          <div className="logo" style={{ textAlign: 'center', width: '100%' }}>
            {/* Logo más grande sin fondo */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: '16px',
              marginTop: '20px'
            }}>
              <img 
                src="/logo.png" 
                alt="Sigurnost Logo"
                style={{ 
                  width: '150px', 
                  height: '150px',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  // Fallback elegante si la imagen no carga
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  // Crear elemento de fallback
                  const fallback = document.createElement('div');
                  fallback.style.cssText = `
                    width: 150px;
                    height: 150px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--primary);
                    border-radius: 20px;
                    color: white;
                    font-size: 48px;
                    font-weight: bold;
                  `;
                  fallback.textContent = 'S';
                  target.parentNode?.insertBefore(fallback, target);
                }}
              />
            </div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: 'var(--text)', 
              marginBottom: '8px'
            }}>
              Sigurnost
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--text-light)',
              fontWeight: '500'
            }}>
              Sistema de Gestión de Empleados
            </p>
          </div>
        </div>
      </header>

      <main className="main-content" style={{ paddingTop: '20px' }}>
        <div className="card" style={{ 
          maxWidth: '400px', 
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '600', 
              color: 'var(--text)',
              marginBottom: '8px'
            }}>
              Iniciar Sesión
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--text-light)'
            }}>
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label>Usuario:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            
            <div className="form-group">
              <label>Contraseña:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            
            {error && (
              <div style={{ 
                color: 'var(--danger)', 
                fontSize: '14px', 
                textAlign: 'center',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontWeight: '500'
              }}>
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="btn"
              style={{ 
                opacity: isLoading ? 0.7 : 1,
                marginTop: '8px'
              }}
            >
              {isLoading ? (
                <>
                  <span>⏳</span>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <span>🔐</span>
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer profesional mejorado */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '40px 20px 30px',
        color: 'var(--text-light)',
        fontSize: '13px',
        borderTop: '1px solid var(--border)',
        marginTop: '40px',
        background: 'var(--card)'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontWeight: '500'
          }}>
            <span>© {new Date().getFullYear()} Sigurnost</span>
            <span style={{ fontSize: '10px', opacity: 0.7 }}>•</span>
            <span>Todos los derechos reservados</span>
          </div>
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>Versión 1.0</span>
            <span style={{ fontSize: '10px' }}>•</span>
          </div>
        </div>
      </footer>
    </div>
  );
}