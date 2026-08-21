import React, { useState, useRef } from 'react';
import { Plus, FileText } from 'lucide-react';

const DocumentsTab = ({ patient }) => {
  const [documents, setDocuments] = useState([
    { name: 'Oncology_Consult_Report.pdf', type: 'Clinical Note', date: 'Oct 12, 2023', size: '2.4 MB' },
    { name: 'CT_Scan_Abdomen_Pelvis.dcm', type: 'Imaging', date: 'Oct 10, 2023', size: '145.2 MB' },
    { name: 'Comprehensive_Metabolic_Panel.pdf', type: 'Lab Result', date: 'Oct 08, 2023', size: '1.1 MB' },
    { name: 'Initial_Biopsy_Results.pdf', type: 'Pathology', date: 'Sep 25, 2023', size: '3.5 MB' }
  ]);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const newDoc = {
        name: file.name,
        type: 'Uploaded Document',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      };
      setDocuments([newDoc, ...documents]);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 style={{ fontSize: '1.1rem' }}>Patient Records & Files</h3>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
        <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => fileInputRef.current?.click()}><Plus size={14} /> Upload Document</button>
      </div>
      <div style={{ padding: '1rem' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem' }}>Document Name</th>
              <th style={{ padding: '1rem' }}>Type</th>
              <th style={{ padding: '1rem' }}>Date Uploaded</th>
              <th style={{ padding: '1rem' }}>Size</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="table-row-hover">
                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={16} color="var(--accent-blue)" /> {doc.name}
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{doc.type}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{doc.date}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{doc.size}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => window.open('/sample_report.pdf', '_blank')}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentsTab;
