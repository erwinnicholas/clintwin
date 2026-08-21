import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Scan, Maximize, Minimize, Rotate3D, X, Activity, Heart, Wind, AlertTriangle, ShieldCheck, ChevronRight, CheckCircle, Move, ZoomIn, ZoomOut, RefreshCw, Zap } from 'lucide-react';
import OrganTelemetry from './OrganTelemetry';
import { mockCancerTypes, mockCancerStages, organHitboxes } from './PopulationTwin_mock_data';
import { organMetrics } from './OrganTelemetry_mock_data';

const PopulationTwin = ({ onSelectPatient, activePatientId, interactiveTelemetry = true, initialPatientId = null, patients = [] }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [activeOrgan, setActiveOrgan] = useState(null);
  const [isGlitching, setIsGlitching] = useState(false);
  const [detailedOrganView, setDetailedOrganView] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mouse Drag / Pan & Zoom State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [selectedPatientCard, setSelectedPatientCard] = useState(null);

  // Helper: find real patient by ID from the patients array
  const findRealPatient = (pid) => {
    const p = patients.find(pt => pt.id === pid || pt.patient_id === pid);
    if (!p) return null;
    // Derive a deterministic eligibility score from actual lab values
    const labScore = (() => {
      let s = 100;
      if (p.egfr && p.egfr < 60) s -= 20;
      if (p.platelets && p.platelets < 100000) s -= 15;
      if (p.hemoglobin && p.hemoglobin < 10) s -= 10;
      if (p.alt && p.alt > 50) s -= 10;
      if (p.ast && p.ast > 50) s -= 10;
      if (p.ecog_score && p.ecog_score > 2) s -= 15;
      return Math.max(0, Math.min(100, s));
    })();
    return {
      id: p.id || p.patient_id,
      status: labScore > 70 ? 'green' : labScore > 40 ? 'yellow' : 'red',
      age: p.age || 'N/A',
      gender: p.sex || p.gender || 'Unknown',
      bmi: p.bmi,
      ecog_score: p.ecog_score,
      systolic_bp: p.systolic_bp,
      diastolic_bp: p.diastolic_bp,
      cancerType: p.cancer_type || 'Under Assessment',
      stage: p.stage || 'Pending',
      score: labScore,
      lastUpdated: 'Latest baseline',
      // Map real lab metrics to organ systems
      metrics: {
        hemoglobin: p.hemoglobin,
        platelets: p.platelets,
        alt: p.alt,
        ast: p.ast,
        egfr: p.egfr
      }
    };
  };

  React.useEffect(() => {
    if (initialPatientId && patients.length > 0) {
      const real = findRealPatient(initialPatientId);
      if (real) {
        setSelectedPatientCard(real);
        setIsScanning(true);
        setZoom(1.5);
        triggerGlitch();
        setTimeout(() => setIsScanning(false), 800);
        if (onSelectPatient) onSelectPatient(real);
      }
    }
  }, [initialPatientId, patients.length]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setHasMoved(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const currentX = e.clientX - dragStart.x;
    const currentY = e.clientY - dragStart.y;
    if (Math.abs(currentX - pan.x) > 3 || Math.abs(currentY - pan.y) > 3) {
      setHasMoved(true);
    }
    setPan({ x: currentX, y: currentY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetPanZoom = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const triggerGlitch = () => {
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), 500);
  };

  if (detailedOrganView && !isFullscreen) {
    return <OrganTelemetry organName={detailedOrganView} onClose={() => setDetailedOrganView(null)} patient={selectedPatientCard} />;
  }

  const twinCoreView = (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100%' : '100%',
        minHeight: isFullscreen ? '100%' : '480px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: '12px',
        background: '#000',
        border: '1px solid rgba(0, 240, 255, 0.15)',
        flexShrink: 0,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* 3D Visualization Image - Base Photo Remains 100% Solid & Steady */}
      <img
        src="/digital_twin.jpg"
        alt="3D Population Twin Base"
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: 0.95,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom * (isScanning ? 1.02 : 1)})`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          userSelect: 'none'
        }}
        onClick={(e) => {
          if (hasMoved) return; // Prevent selection if mouse was dragging
          const rect = e.target.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;

          let organ = null;

          if (interactiveTelemetry && !isGlitching) {
            const cx = Math.abs(x - 0.5);
            if (y >= organHitboxes['Cerebral Cortex'].yMin && y <= organHitboxes['Cerebral Cortex'].yMax && cx <= organHitboxes['Cerebral Cortex'].xTolerance) {
              organ = 'Cerebral Cortex';
            } else if (y >= organHitboxes['Cardiovascular System'].yMin && y <= organHitboxes['Cardiovascular System'].yMax && cx <= organHitboxes['Cardiovascular System'].xTolerance) {
              organ = 'Cardiovascular System';
            } else if (y >= organHitboxes['Respiratory System'].yMin && y <= organHitboxes['Respiratory System'].yMax && cx <= organHitboxes['Respiratory System'].xTolerance) {
              organ = 'Respiratory System';
            }
          }

          if (organ) {
            setActiveOrgan({ name: organ, x: e.clientX - rect.left, y: e.clientY - rect.top });
            triggerGlitch();
            return;
          }

          // Try to find a real patient from the patients array
          const realPatient = patients.length > 0
            ? patients[Math.floor(Math.random() * patients.length)]
            : null;

          const patientCard = realPatient ? {
            id: realPatient.id || realPatient.patient_id,
            status: 'green',
            age: realPatient.age || Math.floor(Math.random() * 40) + 30,
            gender: realPatient.sex || realPatient.gender || (Math.random() > 0.5 ? 'Male' : 'Female'),
            cancerType: realPatient.cancer_type || 'Solid Tumor',
            stage: realPatient.stage || 'II',
            score: realPatient.match_score || Math.floor(Math.random() * 20) + 80,
            lastUpdated: 'Just now',
            metrics: {
              hemoglobin: realPatient.hemoglobin,
              platelets: realPatient.platelets,
              alt: realPatient.alt,
              ast: realPatient.ast,
              egfr: realPatient.egfr,
              anc: realPatient.anc,
            }
          } : {
            id: `P-${Math.floor(Math.random() * 9000) + 1000}`,
            status: isYellow ? 'yellow' : 'green',
            age: Math.floor(Math.random() * 40) + 30,
            gender: Math.random() > 0.5 ? 'Male' : 'Female',
            cancerType: mockCancerTypes[Math.floor(Math.random() * mockCancerTypes.length)],
            stage: mockCancerStages[Math.floor(Math.random() * mockCancerStages.length)],
            score: Math.floor(Math.random() * 40) + 60,
            lastUpdated: 'Just now'
          };
          setSelectedPatientCard(patientCard);
          if (onSelectPatient) onSelectPatient(patientCard);

          setIsScanning(true);
          triggerGlitch();
          setTimeout(() => setIsScanning(false), 800);
        }}
      />

      {/* Pure Body Shake Layer - Zero Color Filters, Zero Shapes, Body-Only Vibration */}
      {isGlitching && (
        <img
          src="/digital_twin.jpg"
          alt="Human Body Pure Shake Effect"
          className="body-shake-only"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 1,
            pointerEvents: 'none',
            zIndex: 90,
            clipPath: 'polygon(48.5% 17%, 51.5% 17%, 52.5% 21%, 54.5% 26%, 55.5% 32%, 55% 44%, 56% 54%, 53.5% 76%, 50% 74%, 46.5% 76%, 44% 54%, 45% 44%, 44.5% 32%, 45.5% 26%, 47.5% 21%)',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }}
        />
      )}

      {/* Sci-fi Overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', background: 'radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.8) 100%)' }}></div>

      {/* Scanning Reticle */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div style={{
          width: '440px',
          height: '440px',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '50%',
          boxShadow: isScanning ? '0 0 60px rgba(0,240,255,0.3) inset' : 'none',
          transition: 'all 0.5s ease'
        }}></div>
      </div>

      {selectedPatientCard && (
        <div style={{
          position: 'absolute',
          top: '1.25rem',
          left: '1.25rem',
          background: 'rgba(5, 15, 30, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 240, 255, 0.5)',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          color: 'white',
          boxShadow: '0 0 25px rgba(0,240,255,0.3)',
          zIndex: 70,
          maxWidth: '380px',
          animation: 'fade-in 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0,240,255,0.15)', border: '1px solid rgba(0,240,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={22} color="var(--accent-blue)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-blue)' }}>{selectedPatientCard.id}</span>
                <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: 'rgba(0,230,118,0.2)', color: 'var(--accent-green)', border: '1px solid rgba(0,230,118,0.4)' }}>
                  {selectedPatientCard.score}% Match
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {selectedPatientCard.gender}, {selectedPatientCard.age} yrs • {selectedPatientCard.cancerType} ({selectedPatientCard.stage})
              </div>
            </div>
            <button
              onClick={() => setSelectedPatientCard(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem', flexShrink: 0 }}
            >
              <X size={18} />
            </button>
          </div>
          {/* Real lab metrics row */}
          {selectedPatientCard.metrics && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { key: 'hemoglobin', label: 'Hgb', unit: 'g/dL', color: '#00e676' },
                { key: 'platelets', label: 'PLT', unit: '/µL', color: '#ff9100' },
                { key: 'egfr', label: 'eGFR', unit: 'mL/m', color: '#00f0ff' },
                { key: 'anc', label: 'ANC', unit: '/µL', color: '#9d4edd' },
                { key: 'alt', label: 'ALT', unit: 'U/L', color: '#ff3d00' },
                { key: 'ast', label: 'AST', unit: 'U/L', color: '#ffd600' },
              ].filter(m => selectedPatientCard.metrics[m.key] != null).map(m => (
                <div key={m.key} style={{ padding: '0.2rem 0.5rem', background: `rgba(${m.color === '#00e676' ? '0,230,118' : m.color === '#ff9100' ? '255,145,0' : m.color === '#00f0ff' ? '0,240,255' : m.color === '#9d4edd' ? '157,78,221' : m.color === '#ff3d00' ? '255,61,0' : '255,214,0'},0.1)`, border: `1px solid ${m.color}33`, borderRadius: '6px', fontSize: '0.68rem', color: m.color }}>
                  <span style={{ fontWeight: 600 }}>{m.label}</span> {typeof selectedPatientCard.metrics[m.key] === 'number' ? selectedPatientCard.metrics[m.key].toFixed(1) : selectedPatientCard.metrics[m.key]} {m.unit}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dynamic Organ Label Popup */}
      {activeOrgan && (
        <div style={{
          position: 'absolute',
          left: activeOrgan.x + 30,
          top: activeOrgan.y - 15,
          background: 'rgba(0, 240, 255, 0.12)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--accent-blue)',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          color: 'var(--accent-blue)',
          fontWeight: 'bold',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          fontSize: '0.8rem',
          boxShadow: '0 0 20px rgba(0,240,255,0.3)',
          animation: 'fade-in 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 80
        }}>
          <div>{activeOrgan.name}</div>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '0.4rem 0.75rem', width: '100%', background: 'rgba(0, 102, 255, 0.4)', border: '1px solid rgba(0, 240, 255, 0.5)', color: 'white', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsScanning(true);
              triggerGlitch();
              setTimeout(() => {
                setIsScanning(false);
                const organName = activeOrgan.name;
                setActiveOrgan(null);
                setDetailedOrganView(organName);
              }, 1200);
            }}
          >
            Access Telemetry
          </button>
        </div>
      )}

      {/* Floating Controls Bar: Glitch FX + Zoom + Scan */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 60 }}>
        {/* Sci-Fi Pulse Sync Button */}
        <button
          onClick={triggerGlitch}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', background: isGlitching ? 'rgba(0,240,255,0.3)' : 'rgba(0,0,0,0.65)', border: '1px solid rgba(0,240,255,0.4)', color: 'var(--accent-blue)', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', backdropFilter: 'blur(10px)' }}
          title="Sync Digital Twin Telemetry Signals"
        >
          <Zap size={15} color="var(--accent-blue)" />
          {isGlitching ? 'Syncing...' : 'Pulse Sync'}
        </button>

        {/* Reset Pan/Zoom */}
        {(pan.x !== 0 || pan.y !== 0 || zoom !== 1) && (
          <button
            onClick={resetPanZoom}
            style={{ padding: '0.45rem 0.85rem', background: 'rgba(0,240,255,0.15)', border: '1px solid rgba(0,240,255,0.4)', color: 'var(--accent-blue)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', backdropFilter: 'blur(8px)' }}
            title="Reset Pan & Zoom"
          >
            <RefreshCw size={14} /> Reset View
          </button>
        )}

        {/* Zoom Controls */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.25, 2.5))}
            style={{ padding: '0.45rem 0.7rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.1)' }}
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.7))}
            style={{ padding: '0.45rem 0.7rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
        </div>

        {/* Deep Scan */}
        <button
          onClick={() => { setIsScanning(!isScanning); if (!isScanning) triggerGlitch(); }}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.85rem', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.78rem' }}
        >
          <Scan size={15} style={{ marginRight: '6px' }} color={isScanning ? "var(--accent-green)" : "white"} />
          {isScanning ? 'Scanning...' : 'Deep Scan'}
        </button>

        {!isFullscreen && (
          <button
            className="btn btn-secondary"
            onClick={() => setIsFullscreen(true)}
            style={{
              padding: '0.45rem 0.85rem',
              background: 'rgba(0,240,255,0.15)',
              border: '1px solid rgba(0,240,255,0.4)',
              color: 'var(--accent-blue)',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backdropFilter: 'blur(10px)'
            }}
            title="Expand Studio to Full Laptop Screen"
          >
            <Maximize size={15} /> Expand Studio
          </button>
        )}
      </div>

      {/* 3 Organ Systems Quick Access Bar */}
      <div style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.6rem', zIndex: 60 }}>
        {['Respiratory System', 'Cerebral Cortex', 'Cardiovascular System'].map(oName => (
          <button
            key={oName}
            onClick={() => setDetailedOrganView(oName)}
            style={{ padding: '0.45rem 0.9rem', background: 'rgba(0, 10, 20, 0.88)', border: '1px solid rgba(0,240,255,0.4)', borderRadius: '18px', color: 'var(--accent-blue)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)', boxShadow: '0 0 12px rgba(0,240,255,0.2)' }}
          >
            {oName}
          </button>
        ))}
      </div>

      {/* Mouse Drag Hint & Status Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '1.25rem',
        left: '1.25rem',
        background: 'rgba(0, 10, 20, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        zIndex: 60
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
          <Move size={14} /> Drag to Pan
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }} /> Optimal Center
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }} /> Eligible Cohort
        </div>
      </div>
    </div>
  );

  // Fullscreen Render - Pure Full-Screen 3D Picture POV
  if (isFullscreen) {
    return createPortal(
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#050a14',
        padding: '1rem 1.5rem',
        width: '100vw',
        height: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        overflow: 'hidden'
      }}>
        {/* Fullscreen Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              Digital Twin Population Studio
              <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.55rem', borderRadius: '12px', background: 'rgba(0,240,255,0.12)', color: 'var(--accent-blue)', border: '1px solid rgba(0,240,255,0.3)' }}>Full Laptop Widescreen POV</span>
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>• Drag mouse to pan (up/down/left/right), click to inspect patient or organ telemetry</span>
          </div>
          <button
            onClick={() => { setIsFullscreen(false); setDetailedOrganView(null); }}
            style={{ padding: '0.45rem 0.95rem', background: 'rgba(255,61,0,0.15)', border: '1px solid rgba(255,61,0,0.4)', color: 'var(--accent-red)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Minimize size={14} /> Exit Full Screen
          </button>
        </div>

        {/* If Organ Telemetry is selected in Expand View, render OrganTelemetry inside Expand View */}
        {detailedOrganView ? (
          <div style={{ flex: 1, height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
            <OrganTelemetry organName={detailedOrganView} onClose={() => setDetailedOrganView(null)} patient={selectedPatientCard} />
          </div>
        ) : (
          /* Pure Full Screen 3D Twin Picture (100% Height & Width) */
          <div style={{ flex: 1, height: 'calc(100vh - 80px)', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '10px', border: '1px solid rgba(0,240,255,0.2)' }}>
            {twinCoreView}
          </div>
        )}
      </div>,
      document.body
    );
  }

  return twinCoreView;
};

export default PopulationTwin;
