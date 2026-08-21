import React from 'react';
import { Dna, AlertCircle, CheckCircle } from 'lucide-react';

import { genomicVariants as variants } from './GenomicProfile_mock_data';

const GenomicProfile = ({ patient }) => {

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Gene Map Visualization */}
      <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '1.5rem 1rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Dna size={16} color="var(--accent-purple)" /> Genomic Variant Map (Chr 7, 2, 12)
          </h4>
        </div>
        
        {/* Chromosome SVG Representation */}
        <div style={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center', margin: '0 10px' }}>
          {/* Base Chromosome Body */}
          <div style={{ position: 'absolute', width: '100%', height: '12px', background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)', borderRadius: '10px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}></div>
          <div style={{ position: 'absolute', width: '20px', height: '24px', left: '45%', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', backdropFilter: 'blur(2px)' }}></div> {/* Centromere */}
          
          {/* Loci Markers */}
          {variants.map((v, i) => {
            const isDetected = v.status === 'Detected';
            const color = isDetected ? 'var(--accent-red)' : 'var(--text-muted)';
            return (
              <div key={i} style={{ position: 'absolute', left: `${v.locus}%`, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateX(-50%)' }}>
                <div style={{ width: '2px', height: '24px', background: color, zIndex: 2 }}></div>
                <div style={{ position: 'absolute', top: '-25px', fontSize: '0.7rem', color: color, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{v.gene}</div>
                {isDetected && (
                   <div style={{ position: 'absolute', top: '10px', width: '12px', height: '12px', background: 'transparent', border: `2px solid ${color}`, borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Variant Details List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Detected Biomarkers</h4>
        {variants.map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: `3px solid ${v.status === 'Detected' ? 'var(--accent-red)' : 'var(--text-muted)'}` }}>
            {v.status === 'Detected' ? <AlertCircle size={16} color="var(--accent-red)" /> : <CheckCircle size={16} color="var(--text-muted)" />}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: v.status === 'Detected' ? 'white' : 'var(--text-muted)' }}>{v.gene} {v.mutation}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{v.type}</span>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: v.status === 'Detected' ? 'rgba(255,61,0,0.1)' : 'rgba(255,255,255,0.05)', color: v.status === 'Detected' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
              {v.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenomicProfile;
