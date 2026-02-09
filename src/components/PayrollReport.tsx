// src/components/PayrollReport.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { PayrollService } from '../lib/payroll';
import { PayrollReport as PayrollReportType } from '../types';

export const PayrollReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PayrollReportType | null>(null);
  const [period, setPeriod] = useState({
    startDate: '',
    endDate: ''
  });
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Inicializar con el mes actual
  useEffect(() => {
    const currentPeriod = PayrollService.getCurrentMonthPeriod();
    setPeriod({
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate
    });
  }, []);

  const generateReport = async () => {
    if (!period.startDate || !period.endDate) {
      alert('Por favor selecciona ambas fechas');
      return;
    }

    if (new Date(period.startDate) > new Date(period.endDate)) {
      alert('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    setLoading(true);
    try {
      const generatedReport = await PayrollService.generatePayrollReport(
        period.startDate,
        period.endDate
      );
      setReport(generatedReport);
    } catch (error: any) {
      alert(`Error al generar reporte: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!report) return;
    
    const csvContent = PayrollService.exportToCSV(report);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const filename = `nomina_${report.period.start_date}_al_${report.period.end_date}.csv`;
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateDaysInPeriod = () => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Calcular total de días normales
  const calculateTotalRegularDays = () => {
    if (!report) return 0;
    return report.records.reduce((sum, record) => sum + record.regular_days, 0);
  };

  // Calcular total de días dobles
  const calculateTotalDoubleDays = () => {
    if (!report) return 0;
    return report.records.reduce((sum, record) => sum + record.double_days, 0);
  };

  // Calcular total de días justificados
  const calculateTotalJustifiedDays = () => {
    if (!report) return 0;
    return report.records.reduce((sum, record) => sum + record.justified_absences, 0);
  };

  return (
    <div className="payroll-report-container">
      <div className="section-header">
        <div>
          <h2>💰 Reporte de Nómina</h2>
          <p className="subtitle">Genera reportes de pago por período</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <h3>Seleccionar Período</h3>
        
        <div className="filters-grid">
          <div className="form-group">
            <label>Fecha de inicio:</label>
            <input
              type="date"
              value={period.startDate}
              onChange={(e) => setPeriod({...period, startDate: e.target.value})}
              className="filter-input"
            />
          </div>
          
          <div className="form-group">
            <label>Fecha de fin:</label>
            <input
              type="date"
              value={period.endDate}
              onChange={(e) => setPeriod({...period, endDate: e.target.value})}
              className="filter-input"
            />
          </div>
        </div>
        
        {/* {period.startDate && period.endDate && (
          <div className="period-info">
            <strong>Período seleccionado:</strong> {formatDate(period.startDate)} al {formatDate(period.endDate)}
            <br />
            <span className="period-days">({calculateDaysInPeriod()} días en el período)</span>
          </div>
        )} */}

        <button 
          onClick={generateReport}
          disabled={loading || !period.startDate || !period.endDate}
          className="btn btn-success generate-btn"
        >
          {loading ? '⏳ Generando reporte...' : '📊 Generar Reporte'}
        </button>
      </div>

      {/* Reporte generado */}
      {report && (
        <div className="card report-card" id="payroll-report-content">
          <div className="report-header">
            <div>
              <h3>Reporte de Nómina</h3>
              <p className="report-period">
                {formatDate(report.period.start_date)} al {formatDate(report.period.end_date)}
              </p>
            </div>
            
            <div className="export-buttons">
              <button 
                onClick={handleExportCSV}
                className="btn btn-secondary export-btn"
              >
                📥 CSV
              </button>
              <button 
                onClick={handlePrint}
                className="btn btn-primary export-btn"
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>

          {/* Resumen del reporte - Versión móvil */}
          <div className="report-summary-mobile">
            <div className="summary-item">
              <div className="summary-label">Empleados</div>
              <div className="summary-value">{report.total_employees}</div>
            </div>
            
            <div className="summary-item">
              <div className="summary-label">Días Trabajados</div>
              <div className="summary-value">{report.total_days_worked}</div>
            </div>
            
            <div className="summary-item total-item">
              <div className="summary-label">Nómina Total</div>
              <div className="summary-value">{formatCurrency(report.total_payroll)}</div>
            </div>
          </div>

          {/* Tabla de empleados - Versión móvil */}
          <div className="payroll-list-mobile">
            {report.records.map((record) => (
              <div key={record.employee_id} className="employee-payroll-card">
                <div className="employee-header">
                  <h4>{record.employee_name}</h4>
                  <div className="employee-total">
                    {formatCurrency(record.total_pay)}
                  </div>
                </div>
                
                <div className="employee-details">
                  <div className="detail-row">
                    <span className="detail-label">Días normales:</span>
                    <span className="detail-value">{record.regular_days}</span>
                  </div>
                  
                  {record.double_days > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Días dobles:</span>
                      <span className="detail-value double">
                        {record.double_days} × 2 días = {record.double_days * 2} días
                      </span>
                    </div>
                  )}
                  
                  {record.justified_absences > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Días justificados:</span>
                      <span className="detail-value justified">
                        {record.justified_absences}
                      </span>
                    </div>
                  )}
                  
                  <div className="detail-row">
                    <span className="detail-label">Total días trabajados:</span>
                    <span className="detail-value total-days">
                      {record.total_days_worked} días
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Salario diario:</span>
                    <span className="detail-value salary">
                      {formatCurrency(record.daily_salary)}
                    </span>
                  </div>
                </div>
                
                <div className="employee-calculation">
                  <div className="calculation-formula">
                    {record.regular_days} días × {formatCurrency(record.daily_salary)} = {formatCurrency(record.regular_days * record.daily_salary)}
                  </div>
                  {record.double_days > 0 && (
                    <div className="calculation-formula">
                      + {record.double_days} días dobles × {formatCurrency(record.daily_salary)} × 2 = {formatCurrency(record.double_days * record.daily_salary * 2)}
                    </div>
                  )}
                  <div className="calculation-total">
                    Total: {formatCurrency(record.total_pay)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totales finales - Versión móvil */}
          <div className="final-totals-mobile">
            <div className="total-breakdown">
              <div className="breakdown-item">
                <span>Días normales totales:</span>
                <span>{calculateTotalRegularDays()}</span>
              </div>
              <div className="breakdown-item">
                <span>Días dobles totales:</span>
                <span>{calculateTotalDoubleDays()}</span>
              </div>
              <div className="breakdown-item">
                <span>Días justificados totales:</span>
                <span>{calculateTotalJustifiedDays()}</span>
              </div>
              <div className="breakdown-item">
                <span>Total días trabajados:</span>
                <span>{report.total_days_worked}</span>
              </div>
            </div>
            
            <div className="grand-total">
              <span>TOTAL NÓMINA:</span>
              <span>{formatCurrency(report.total_payroll)}</span>
            </div>
          </div>

          {/* Notas del reporte */}
          <div className="report-notes">
            <h4>📝 Notas</h4>
            <ul>
              <li>Los días dobles cuentan como 2 días trabajados para el pago</li>
              <li>Los días justificados no se pagan pero se muestran para referencia</li>
              <li>Solo se incluyen asistencias con estado "Aprobado"</li>
              <li>Días en el período: {calculateDaysInPeriod()} días</li>
              <li>Reporte generado el {new Date().toLocaleDateString('es-ES')}</li>
            </ul>
          </div>
        </div>
      )}

      {/* Estilos específicos para móvil */}
      <style jsx>{`
        .payroll-report-container {
          max-width: 100%;
          margin: 0 auto;
          padding: 0 4px;
        }

        .section-header {
          margin-bottom: 16px;
        }
        
        .section-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }
        
        .subtitle {
          margin: 4px 0 0;
          color: var(--text-light);
          font-size: 13px;
        }

        .card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .card h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        @media (min-width: 480px) {
          .filters-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }

        .filter-input {
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 14px;
          width: 100%;
        }

        .period-info {
          background: var(--background);
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
        }

        .period-days {
          font-size: 12px;
          color: var(--text-light);
        }

        .btn {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn:hover {
          background: var(--primary-dark);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-success {
          background: var(--success);
        }

        .btn-success:hover {
          background: var(--success-dark);
        }

        .btn-secondary {
          background: var(--secondary);
        }

        .btn-secondary:hover {
          background: #5a6370;
        }

        .btn-primary {
          background: var(--primary);
        }

        .btn-primary:hover {
          background: var(--primary-dark);
        }

        .generate-btn {
          width: 100%;
          padding: 12px;
          font-size: 15px;
        }

        .report-card {
          padding: 12px;
        }

        .report-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        @media (min-width: 480px) {
          .report-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
          }
        }

        .report-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .report-period {
          margin: 4px 0 0;
          color: var(--text-light);
          font-size: 13px;
        }

        .export-buttons {
          display: flex;
          gap: 8px;
        }

        .export-btn {
          padding: 8px 12px;
          font-size: 13px;
          min-width: 80px;
        }

        /* Resumen para móvil */
        .report-summary-mobile {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }

        .summary-item {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 8px;
          text-align: center;
        }

        .total-item {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          border: none;
          color: white;
        }

        .total-item .summary-label,
        .total-item .summary-value {
          color: white;
        }

        .summary-label {
          font-size: 11px;
          color: var(--text-light);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          font-weight: 600;
        }

        .summary-value {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }

        /* Lista de empleados para móvil */
        .payroll-list-mobile {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .employee-payroll-card {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .employee-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }

        .employee-header h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          flex: 1;
        }

        .employee-total {
          font-size: 16px;
          font-weight: 700;
          color: var(--success);
          background: rgba(16, 185, 129, 0.1);
          padding: 4px 8px;
          border-radius: 6px;
        }

        .employee-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .detail-label {
          color: var(--text-light);
          font-weight: 500;
        }

        .detail-value {
          font-weight: 600;
          color: var(--text);
        }

        .detail-value.double {
          color: var(--warning);
        }

        .detail-value.justified {
          color: var(--success);
        }

        .detail-value.total-days {
          color: var(--primary);
        }

        .detail-value.salary {
          color: var(--primary-dark);
        }

        .employee-calculation {
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.1);
          border-radius: 6px;
          padding: 10px;
          margin-top: 12px;
        }

        .calculation-formula {
          font-size: 12px;
          color: var(--text-light);
          margin-bottom: 4px;
        }

        .calculation-total {
          font-size: 14px;
          font-weight: 700;
          color: var(--success);
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid rgba(59, 130, 246, 0.1);
        }

        /* Totales finales para móvil */
        .final-totals-mobile {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .total-breakdown {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          padding: 6px 0;
          border-bottom: 1px solid var(--border);
        }

        .breakdown-item:last-child {
          border-bottom: none;
          font-weight: 600;
          color: var(--primary);
        }

        .grand-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: white;
          padding: 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 16px;
        }

        /* Notas del reporte */
        .report-notes {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          font-size: 12px;
          color: var(--text-light);
        }

        .report-notes h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: var(--text);
        }

        .report-notes ul {
          margin: 0;
          padding-left: 16px;
        }

        .report-notes li {
          margin-bottom: 4px;
          line-height: 1.4;
        }

        /* Estilos para impresión */
        @media print {
          .bottom-nav,
          .header,
          .export-buttons,
          .generate-btn,
          .filter-input {
            display: none !important;
          }
          
          .card {
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0;
          }
          
          .employee-payroll-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }

        /* Ajustes para pantallas más grandes */
        @media (min-width: 768px) {
          .payroll-report-container {
            padding: 0 8px;
          }
          
          .card {
            padding: 20px;
          }
          
          .employee-payroll-card {
            padding: 16px;
          }
          
          .detail-row {
            font-size: 14px;
          }
          
          .calculation-formula {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default PayrollReport;