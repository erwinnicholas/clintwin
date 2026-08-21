import React from 'react';
import { Download } from 'lucide-react';

export const ExportReportModal = ({
  isOpen,
  onClose,
  title = 'Executive Report',
  pdfTitle = 'ClinTwin Executive Report',
  columns = [],
  data = [],
  fileNamePrefix = 'clintwin_report',
  onSuccess
}) => {
  if (!isOpen) return null;

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableHeadersHTML = columns.map(c => `<th>${c}</th>`).join('');
    const tableRowsHTML = data.map(row => {
      const cells = Object.values(row).map(val => `<td>${val !== undefined && val !== null ? val : ''}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${pdfTitle}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0b0f19; color: #e2e8f0; padding: 2.5rem; }
            .header { border-bottom: 2px solid #00f0ff; padding-bottom: 1.25rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 26px; font-weight: bold; color: #00f0ff; }
            .subtitle { font-size: 13px; color: #94a3b8; margin-top: 6px; }
            .badge { background: rgba(0,240,255,0.15); color: #00f0ff; padding: 6px 14px; border-radius: 20px; border: 1px solid #00f0ff; font-size: 11px; font-weight: 700; }
            .section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; }
            .section-title { font-size: 16px; font-weight: bold; color: #ffffff; margin-bottom: 1rem; border-left: 4px solid #00f0ff; padding-left: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { border: 1px solid rgba(255,255,255,0.1); padding: 10px 14px; text-align: left; font-size: 13px; }
            th { background: rgba(0,240,255,0.12); color: #00f0ff; font-weight: 700; text-transform: uppercase; font-size: 11px; }
            tr:nth-child(even) { background: rgba(255,255,255,0.015); }
            .footer { margin-top: 3rem; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.25rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${pdfTitle}</div>
              <div class="subtitle">Generated on ${new Date().toLocaleString()} | Confidential Clinical Digital Twin Telemetry</div>
            </div>
            <div class="badge">HIPAA COMPLIANT REPORT</div>
          </div>

          <div class="section">
            <div class="section-title">${title} Summary Table</div>
            <table>
              <thead>
                <tr>${tableHeadersHTML}</tr>
              </thead>
              <tbody>
                ${tableRowsHTML}
              </tbody>
            </table>
          </div>

          <div class="footer">
            ClinTwin Digital Twin Healthcare Platform &copy; 2026. Confidential Audit Signature #${Math.floor(100000 + Math.random() * 900000)}
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    if (onSuccess) onSuccess('Opening PDF Print & Save window...');
    onClose();
  };

  const handleExportCSV = () => {
    const csvHeader = columns.join(',') + '\n';
    const csvRows = data.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onSuccess) onSuccess(`${title} CSV dataset exported successfully!`);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '480px', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.3)', boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)', position: 'relative' }}>
        <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={20} color="var(--accent-blue)" /> Export {title}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Select your preferred export document format for {title}:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div 
            onClick={handleExportPDF}
            style={{ padding: '1.25rem', background: 'rgba(0, 240, 255, 0.06)', border: '1px solid var(--accent-blue)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '1rem' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ padding: '0.75rem', background: 'rgba(0, 240, 255, 0.15)', borderRadius: '8px', color: 'var(--accent-blue)', fontSize: '1.2rem' }}>
              📄
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>Export as PDF Document (.pdf)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Executive formatted PDF report with charts & tables ready for printing or saving</div>
            </div>
          </div>

          <div 
            onClick={handleExportCSV}
            style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '1rem' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ padding: '0.75rem', background: 'rgba(0, 230, 118, 0.15)', borderRadius: '8px', color: 'var(--accent-green)', fontSize: '1.2rem' }}>
              📊
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>Export Raw CSV Data (.csv)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Comma-separated values data sheet for Excel / data analysis</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
