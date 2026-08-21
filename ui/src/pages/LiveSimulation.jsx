import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Activity, Play, Pause, ArrowLeft, AlertTriangle, CheckCircle,
  TrendingUp, Users, Shield, Radio, Zap, BarChart3, Heart, Dna, Eye
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, ReferenceLine } from 'recharts';
import toast from 'react-hot-toast';
import { SectionHeader, StatCard } from '../components/common/UIComponents';
import ExplainButton from '../components/common/ExplainButton';
import { startLiveFeed, stepLiveFeed, fetchActiveLiveFeed } from '../services/api';
import { useGlobalData } from '../context/GlobalDataContext';

const METRIC_LABELS = {
  egfr: { label: 'eGFR', unit: 'mL/min', color: '#00f0ff', threshold: 30, thresholdDir: 'below', domain: [0, 150] },
  platelets: { label: 'Platelets', unit: '/µL', color: '#ff9100', threshold: 50000, thresholdDir: 'below', domain: [0, 400000] },
  alt: { label: 'ALT', unit: 'U/L', color: '#ff3d00', threshold: 150, thresholdDir: 'above', domain: [0, 300] },
  hemoglobin: { label: 'Hemoglobin', unit: 'g/dL', color: '#00e676', threshold: 7, thresholdDir: 'below', domain: [0, 20] },
  anc: { label: 'ANC', unit: '/µL', color: '#9d4edd', threshold: 500, thresholdDir: 'below', domain: [0, 8000] },
  ast: { label: 'AST', unit: 'U/L', color: '#ffd600', threshold: 150, thresholdDir: 'above', domain: [0, 300] },
};

const ARM_COLORS = {
  ARM_CONTROL: { main: '#888888', bg: 'rgba(136,136,136,0.15)' },
  ARM_VACCINE_A: { main: '#00e676', bg: 'rgba(0,230,118,0.15)' },
  ARM_VACCINE_B: { main: '#ff3d00', bg: 'rgba(255,61,0,0.15)' },
};

const ARM_LABELS = {
  ARM_CONTROL: 'Control (Placebo)',
  ARM_VACCINE_A: 'Vaccine A',
  ARM_VACCINE_B: 'Vaccine B',
};

const LiveSimulation = () => {
  const { trialId } = useParams();
  const navigate = useNavigate();
  const { simState, setSimState } = useGlobalData();

  // Restore from persisted state if available
  const saved = simState[trialId];

  const [status, setStatus] = useState(saved?.status === 'running' ? 'paused' : (saved?.status || 'idle'));
  const [runId, setRunId] = useState(saved?.runId || null);
  const [currentDay, setCurrentDay] = useState(saved?.currentDay || 0);
  const [totalDays, setTotalDays] = useState(saved?.totalDays || 180);
  const [activePatients, setActivePatients] = useState(saved?.activePatients || 0);
  const [totalPatients, setTotalPatients] = useState(saved?.totalPatients || 0);

  const [selectedMetric, setSelectedMetric] = useState(saved?.selectedMetric || 'platelets');
  const [chartData, setChartData] = useState(saved?.chartData || []);
  const [trackingErrors, setTrackingErrors] = useState(saved?.trackingErrors || {});
  const [overallMape, setOverallMape] = useState(saved?.overallMape || 0);
  const [actionSummary, setActionSummary] = useState(saved?.actionSummary || { CONTINUE: 0, HOLD_DOSE: 0, HALT_PATIENT: 0 });
  const [alerts, setAlerts] = useState(saved?.alerts || []);
  const [decisions, setDecisions] = useState(saved?.decisions || []);

  const intervalRef = useRef(null);
  const isRunningRef = useRef(false);

  // Hydrate state from backend if missing
  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      // Don't hydrate if we already have local state for this trial
      if (saved?.runId && chartData.length > 0) return;
      
      try {
        const feed = await fetchActiveLiveFeed(trialId);
        console.log("[LiveSimulation] Fetched active live feed:", feed);
        if (mounted && feed.active) {
          setRunId(feed.run_id);
          setStatus('paused'); // Pause so they can choose to resume
          setCurrentDay(feed.current_day);
          setTotalDays(feed.total_days);
          
          if (feed.total_patients !== undefined) {
            setTotalPatients(feed.total_patients);
            // On day 0, if there's no history, set active to total so the UI shows ready
            if (!feed.history || feed.history.length === 0) {
              setActivePatients(feed.total_patients);
            }
          }
          
          if (feed.history && feed.history.length > 0) {
            // Reconstruct chartData from history
            const newChartData = [];
            feed.history.forEach((step, idx) => {
               const dayPoint = { day: step.day };
               ['ARM_CONTROL', 'ARM_VACCINE_A', 'ARM_VACCINE_B'].forEach(arm => {
                 if (step.ground_truth[arm]) {
                   Object.keys(METRIC_LABELS).forEach(key => {
                     const realityVal = step.ground_truth[arm][key];
                     const forecastVal = step.model_forecast[arm] ? step.model_forecast[arm][key] : realityVal;
                     
                     dayPoint[`${arm}_reality_${key}`] = realityVal;
                     dayPoint[`${arm}_forecast_${key}`] = forecastVal;
                     
                     const rawSlope = forecastVal - realityVal;
                     const prevSlope = newChartData.length > 0 ? (newChartData[newChartData.length - 1][`${arm}_slope_${key}`] || rawSlope) : rawSlope;
                     dayPoint[`${arm}_slope_${key}`] = (rawSlope * 0.2) + (prevSlope * 0.8);
                   });
                 }
               });
               newChartData.push(dayPoint);
            });
            setChartData(newChartData);
            
            // Set overall MAPE from last step
            const lastStep = feed.history[feed.history.length - 1];
            console.log("[LiveSimulation] lastStep from history:", lastStep);
            if (lastStep) {
              if (lastStep.overall_mape !== undefined) {
                setOverallMape(lastStep.overall_mape);
              }
              if (lastStep.active_patients !== undefined) {
                console.log("[LiveSimulation] Setting activePatients from hydrate:", lastStep.active_patients);
                setActivePatients(lastStep.active_patients);
              }
            }
          }
        }
      } catch (err) {
        toast.error("Failed to hydrate active feed.");
        console.error(err);
      }
    };
    hydrate();
    return () => { mounted = false; };
  }, [trialId]); // Only run on mount or trial change

  // Persist state on every meaningful update
  useEffect(() => {
    if (status === 'idle' && !runId) return; // Don't save empty state
    setSimState(prev => ({
      ...prev,
      [trialId]: { status, runId, currentDay, totalDays, activePatients, totalPatients, selectedMetric, chartData, trackingErrors, overallMape, actionSummary, alerts, decisions }
    }));
  }, [currentDay, alerts.length, decisions.length, status, overallMape]);

  const handleStart = useCallback(async () => {
    setStatus('starting');
    try {
      const result = await startLiveFeed(trialId);
      if (result && result.run_id) {
        setRunId(result.run_id);
        setStatus('running');
        isRunningRef.current = true;
      }
    } catch (err) {
      toast.error('Failed to start live feed.');
      console.error(err);
      setStatus('idle');
    }
  }, [trialId]);

  const handleStep = useCallback(async (currentRunId) => {
    if (!currentRunId) return;
    try {
      const step = await stepLiveFeed(trialId, currentRunId);
      console.log("[LiveSimulation] handleStep received:", step);
      if (!step) return;

      setCurrentDay(step.current_day);
      setTotalDays(step.total_days);
      console.log("[LiveSimulation] handleStep setting activePatients:", step.active_patients);
      setActivePatients(step.active_patients);
      setTotalPatients(step.total_patients);
      setTrackingErrors(step.tracking_error);
      setOverallMape(step.overall_mape);
      setActionSummary(step.action_summary);

      if (step.alerts && step.alerts.length > 0) {
        setAlerts(prev => [...step.alerts.map(a => ({ ...a, _ts: Date.now() })), ...prev].slice(0, 50));
      }
      if (step.agent_decisions && step.agent_decisions.length > 0) {
        setDecisions(prev => [...step.agent_decisions.map(d => ({ ...d, day: step.current_day, _ts: Date.now() })), ...prev].slice(0, 50));
      }

      // Build chart data point
      setChartData(prev => {
        const newData = [...prev];
        const dayPoint = { day: step.current_day };
        
        ['ARM_CONTROL', 'ARM_VACCINE_A', 'ARM_VACCINE_B'].forEach(arm => {
          if (step.ground_truth[arm]) {
            Object.keys(METRIC_LABELS).forEach(key => {
              const realityVal = step.ground_truth[arm][key];
              const forecastVal = step.model_forecast[arm] ? step.model_forecast[arm][key] : realityVal;
              
              dayPoint[`${arm}_reality_${key}`] = realityVal;
              dayPoint[`${arm}_forecast_${key}`] = forecastVal;
              
              const rawSlope = forecastVal - realityVal;
              const prevSlope = prev.length > 0 ? (prev[prev.length - 1][`${arm}_slope_${key}`] || rawSlope) : rawSlope;
              dayPoint[`${arm}_slope_${key}`] = (rawSlope * 0.2) + (prevSlope * 0.8);
            });
          }
        });
        
        newData.push(dayPoint);
        return newData;
      });

    } catch (err) {
      if (err.message && err.message.includes('completed')) {
        setStatus('completed');
        isRunningRef.current = false;
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else if (err.message && (err.message.includes('No active live feed') || err.message.includes('404'))) {
        toast.error('Session expired in backend. Auto-restarting...');
        console.error("Session missing from backend memory:", err);
        
        // Clear interval
        isRunningRef.current = false;
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        // Auto-restart
        handleStart();
      } else {
        toast.error('Simulation step error.');
        console.error(err);
      }
    }
  }, [trialId]);

  // Auto-step interval
  useEffect(() => {
    if (status === 'running' && runId) {
      intervalRef.current = setInterval(() => {
        if (isRunningRef.current) {
          handleStep(runId);
        }
      }, 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [status, runId, handleStep]);

  console.log(`[LiveSimulation Render] activePatients: ${activePatients}, totalPatients: ${totalPatients}, status: ${status}, runId: ${runId}`);

  const handlePause = () => {
    isRunningRef.current = false;
    setStatus('paused');
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleResume = () => {
    isRunningRef.current = true;
    setStatus('running');
  };

  const progressPct = totalDays > 0 ? (currentDay / totalDays * 100).toFixed(1) : 0;

  const metricInfo = METRIC_LABELS[selectedMetric];

  // Compute extended forecast projecting from current day to total days
  const extendedChartData = React.useMemo(() => {
    if (chartData.length === 0) return [];
    
    // 1. Base historical data
    const extended = chartData.map(d => ({ ...d }));
    
    // 2. The last known point where Reality stops
    const lastPoint = extended[extended.length - 1];
    const currentRecordedDay = lastPoint.day;
    
    // 3. Anchor the forecast to start EXACTLY at the last Reality point
    ['ARM_CONTROL', 'ARM_VACCINE_A', 'ARM_VACCINE_B'].forEach(arm => {
       Object.keys(METRIC_LABELS).forEach(key => {
          if (lastPoint[`${arm}_reality_${key}`] !== undefined) {
             lastPoint[`${arm}_forecast_${key}`] = lastPoint[`${arm}_reality_${key}`];
          }
       });
    });

    // 4. Project forward to totalDays
    const targetDays = totalDays > 0 ? totalDays : 30; // Fallback to 30 if totalDays not set
    if (currentRecordedDay < targetDays) {
      for (let d = currentRecordedDay + 1; d <= targetDays; d++) {
        const futurePoint = { day: d };
        const stepsAhead = d - currentRecordedDay;
        
        ['ARM_CONTROL', 'ARM_VACCINE_A', 'ARM_VACCINE_B'].forEach(arm => {
           Object.keys(METRIC_LABELS).forEach(key => {
             const baseVal = lastPoint[`${arm}_reality_${key}`];
             if (baseVal !== undefined) {
               // Add a slight decay to the slope to simulate stabilizing forecast
               const rawSlope = lastPoint[`${arm}_slope_${key}`] || 0;
               const decayedSlope = rawSlope * Math.pow(0.95, stepsAhead - 1); 
               
               futurePoint[`${arm}_forecast_${key}`] = baseVal + (rawSlope * stepsAhead);
             }
           });
        });
        
        extended.push(futurePoint);
      }
    }
    
    return extended;
  }, [chartData, totalDays]);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem 0.7rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity size={20} color="var(--accent-red)" className={status === 'running' ? 'pulse-animation' : ''} />
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Live Trial Monitor</h1>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{trialId}</span>
                {status === 'running' && (
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(255,61,0,0.15)', color: 'var(--accent-red)', borderRadius: '10px', border: '1px solid rgba(255,61,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                    <Radio size={10} className="pulse-animation" /> LIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Hospital data streaming → Kalman Filter belief update → POMDP forecast & monitoring
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={() => navigate(`/dashboard/trials/${trialId}/eligibility`)} style={{ background: 'linear-gradient(135deg, rgba(157,78,221,0.2), rgba(0,240,255,0.2))', border: '1px solid rgba(157,78,221,0.4)', color: '#c084fc', padding: '0.4rem 0.9rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Dna size={14} /> Digital Twins
            </button>
            {status === 'idle' && (
              <button className="btn btn-primary" onClick={handleStart} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Play size={14} /> Start Live Monitor
              </button>
            )}
            {status === 'starting' && (
              <button className="btn btn-secondary" disabled style={{ opacity: 0.6 }}>Initializing...</button>
            )}
            {status === 'running' && (
              <button className="btn btn-secondary" onClick={handlePause} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Pause size={14} /> Pause
              </button>
            )}
            {status === 'paused' && (
              <button className="btn btn-primary" onClick={handleResume} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Play size={14} /> Resume
              </button>
            )}
            {status === 'completed' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle size={16} /> Simulation Complete
                </span>
                <button className="btn btn-primary" onClick={() => navigate(`/dashboard/trials/${trialId}`)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}>
                  View Trial Overview
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {status !== 'idle' && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              <span>Day {currentDay} / {totalDays}</span>
              <span>{activePatients} / {totalPatients} active patients</span>
              <span>{progressPct}% complete</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))', borderRadius: '2px', transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* KPI Row */}
      {status !== 'idle' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <StatCard title="Tracking Accuracy" value={overallMape !== undefined && overallMape !== null ? `${(100 - overallMape).toFixed(1)}%` : '—'} subtext={`MAPE: ${overallMape}%`} icon={TrendingUp} color="0, 230, 118" />
          <StatCard title="Active Patients" value={activePatients?.toString() || '0'} subtext={`of ${totalPatients || 0} enrolled`} icon={Users} color="0, 102, 255" />
          <StatCard title="Dose Holds" value={actionSummary?.HOLD_DOSE?.toString() || '0'} subtext="Safety holds triggered" icon={Shield} color="255, 214, 0" />
          <StatCard title="Patient Halts" value={actionSummary?.HALT_PATIENT?.toString() || '0'} subtext="Critical safety stops" icon={AlertTriangle} color="255, 61, 0" />
        </div>
      )}

      {status === 'idle' ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
          <Activity size={56} color="var(--accent-blue)" style={{ marginBottom: '1.5rem', opacity: 0.6 }} />
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Ready to Monitor</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 2rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Click "Start Live Monitor" to begin streaming hospital lab data through the Kalman Filter and POMDP Agent. 
            Each second shows one day of patient data, with the model forecasting and monitoring in real-time.
          </p>
          <button className="btn btn-primary" onClick={handleStart} style={{ fontSize: '1rem', padding: '0.75rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={18} /> Start Live Monitor
          </button>
        </div>
      ) : (
        <>
          {/* Main Chart Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={16} color="var(--accent-blue)" />
                    Forecast vs Reality — {metricInfo.label}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Solid = Hospital Data (Reality) | Dashed = Model Forecast (Predicted)
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {Object.entries(METRIC_LABELS).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedMetric(key)}
                      style={{
                        background: selectedMetric === key ? `${info.color}22` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${selectedMetric === key ? info.color : 'rgba(255,255,255,0.1)'}`,
                        color: selectedMetric === key ? info.color : 'var(--text-secondary)',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        fontWeight: selectedMetric === key ? 600 : 400,
                        transition: 'all 0.2s',
                      }}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </div>

            <div style={{ height: '340px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={extendedChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={11} label={{ value: 'Day', position: 'insideBottom', offset: -2, fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                    <YAxis domain={metricInfo.domain || ['auto', 'auto']} stroke="rgba(255,255,255,0.3)" fontSize={11} label={{ value: metricInfo.unit, angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.78rem' }}
                      labelFormatter={(v) => `Day ${v}`}
                    />
                    {metricInfo.threshold && (
                      <ReferenceLine y={metricInfo.threshold} stroke="rgba(255,61,0,0.5)" strokeDasharray="6 4" label={{ value: `Safety: ${metricInfo.threshold}`, position: 'right', fill: 'rgba(255,61,0,0.7)', fontSize: 10 }} />
                    )}
                    {Object.entries(ARM_COLORS).map(([arm, colors]) => (
                      <React.Fragment key={arm}>
                        {/* Reality Line (Solid, Thick) */}
                        <Line isAnimationActive={false} type="monotone" dataKey={`${arm}_reality_${selectedMetric}`} stroke={colors.main} strokeWidth={3} dot={false} name={`${ARM_LABELS[arm]} (Reality)`} activeDot={{ r: 5, fill: colors.main }} />
                        {/* Forecast Line (Dashed, Thinner, Faded) */}
                        <Line isAnimationActive={false} type="monotone" dataKey={`${arm}_forecast_${selectedMetric}`} stroke={colors.main} strokeWidth={2.5} strokeDasharray="6 6" dot={false} name={`${ARM_LABELS[arm]} (Forecast)`} opacity={0.45} />
                      </React.Fragment>
                    ))}
                    <Legend wrapperStyle={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tracking Accuracy Panel */}
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={14} color="var(--accent-green)" /> Per-Metric Tracking
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                {Object.entries(METRIC_LABELS).map(([key, info]) => {
                  const err = trackingErrors[key];
                  const hasErr = err !== undefined && err !== null;
                  const accuracy = hasErr ? (100 - err).toFixed(1) : '—';
                  const errStr = hasErr ? err.toFixed(2) : '0.00';
                  const isGood = hasErr && err < 2;
                  return (
                    <div key={key} style={{ padding: '0.55rem 0.65rem', background: selectedMetric === key ? 'rgba(0,240,255,0.06)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', border: `1px solid ${selectedMetric === key ? 'rgba(0,240,255,0.2)' : 'rgba(255,255,255,0.05)'}`, cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedMetric(key)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: info.color }} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>{info.label}</span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isGood ? 'var(--accent-green)' : err > 5 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
                          {accuracy}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        MAPE: {errStr}%
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,230,118,0.06)', borderRadius: '8px', border: '1px solid rgba(0,230,118,0.15)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Overall MAPE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: overallMape < 2 ? 'var(--accent-green)' : overallMape < 5 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                  {overallMape !== undefined && overallMape !== null ? `${overallMape}%` : '—'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Target: &lt; 2%</div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Alerts + Agent Decisions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', maxHeight: '280px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={14} color="var(--accent-red)" /> Forecast Alerts
                {alerts.length > 0 && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(255,61,0,0.15)', color: 'var(--accent-red)', borderRadius: '8px' }}>{alerts.length}</span>}
              </h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.85rem' }}>No alerts yet — monitoring...</div>
                ) : (
                  alerts.slice(0, 20).map((a, i) => (
                    <div key={i} onClick={() => navigate(`/dashboard/trials/${trialId}/eligibility?patientId=${a.patient_id}`)} style={{ padding: '0.5rem 0.65rem', background: a.severity === 'CRITICAL' ? 'rgba(255,61,0,0.08)' : 'rgba(255,214,0,0.06)', borderRadius: '6px', border: `1px solid ${a.severity === 'CRITICAL' ? 'rgba(255,61,0,0.2)' : 'rgba(255,214,0,0.15)'}`, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: a.severity === 'CRITICAL' ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{a.severity}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Day {a.day} · {a.patient_id}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                        <span style={{ color: 'var(--text-secondary)', lineHeight: 1.3 }}>{a.message}</span>
                        <Dna size={12} color="var(--accent-purple)" style={{ flexShrink: 0, marginLeft: '0.5rem' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', maxHeight: '280px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={14} color="var(--accent-purple)" /> Agent Decisions
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  (HOLD / HALT only)
                </span>
              </h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {decisions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.85rem' }}>All patients stable — CONTINUE</div>
                ) : (
                  decisions.slice(0, 20).map((d, i) => (
                    <div key={i} onClick={() => navigate(`/dashboard/trials/${trialId}/eligibility?patientId=${d.patient_id}`)} style={{ padding: '0.5rem 0.65rem', background: d.action === 'HALT_PATIENT' ? 'rgba(255,61,0,0.08)' : 'rgba(157,78,221,0.08)', borderRadius: '6px', border: `1px solid ${d.action === 'HALT_PATIENT' ? 'rgba(255,61,0,0.2)' : 'rgba(157,78,221,0.2)'}`, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: d.action === 'HALT_PATIENT' ? 'var(--accent-red)' : 'var(--accent-purple)' }}>{d.action ? d.action.replace('_', ' ') : 'UNKNOWN'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Day {d.day} · {d.patient_id} · {ARM_LABELS[d.arm_id] || d.arm_id}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.3 }}>{d.rationale}</div>
                      <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <ExplainButton 
                          payload={{
                            action: d.action,
                            rationale: d.rationale,
                            belief_state: d.belief_state || { patient_id: d.patient_id, day: d.day }
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LiveSimulation;
