import React, { useState } from 'react';
import { Monitor, Activity, HardDrive, Database, Server, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, YAxis } from 'recharts';
import { SectionHeader } from '../components/common/UIComponents';

import { usageData, coreMicroservices } from './SystemHealth_mock_data';

const SystemHealth = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <SectionHeader 
        title="System Health & Infrastructure" 
        subtitle="Monitor core microservices, API loads, and database health" 
        action={<button onClick={handleRefresh} disabled={isRefreshing} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', opacity: isRefreshing ? 0.7 : 1 }}><RefreshCw size={16} style={{ marginRight: '8px', animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}/> {isRefreshing ? 'Refreshing...' : 'Refresh Topology'}</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        
        {/* Resource Graphs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Global API Load & Traffic</h3>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="load" stroke="var(--accent-purple)" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Digital Twin Generation Latency (ms)</h3>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="latency" stroke="var(--accent-yellow)" strokeWidth={2} dot={{ fill: 'var(--bg-primary)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Core Microservices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Core Microservices</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {coreMicroservices.map((svc, idx) => {
                const Icon = svc.icon;
                return (
                <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Icon size={18} color="var(--text-secondary)" />
                      <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{svc.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: `rgba(255,255,255,0.05)`, color: svc.color, borderRadius: '4px', border: `1px solid ${svc.color}` }}>
                      {svc.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '2.25rem' }}>
                    {svc.metric}
                  </div>
                </div>
              )})}
            </div>
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Storage Quota</h4>
               <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                 <span>240 GB Used</span>
                 <span>500 GB Total</span>
               </div>
               <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                 <div style={{ width: '48%', height: '100%', background: 'var(--accent-blue)', borderRadius: '3px' }}></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
