import { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  AlertTriangle, Truck, BedDouble, Brain, Play, ChevronRight, RotateCcw, Building2
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import TopBar from '../components/layout/TopBar';
import StatCard from '../components/cards/StatCard';
import EmergencyMap from '../components/map/EmergencyMap';
import { useWebSocket } from '../hooks/useWebSocket';
import { SEVERITY_COLORS, INCIDENT_ICONS, PRIORITY_COLORS } from '../utils/constants';
import { formatDistanceToNow } from 'date-fns';
import api from '../utils/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

const SCENARIO_STEPS = [
  { label: 'Init: Incidents A, B, C', desc: 'Road accident (5 people), cardiac emergency, urban flooding (15 trapped)' },
  { label: 'Ambulance Breaks Down', desc: 'Nearest ambulance becomes unavailable → system reallocates' },
  { label: 'Hospital ICU Full', desc: 'Selected hospital runs out of ICU beds → new hospital assigned' },
  { label: 'Traffic Congestion', desc: 'Heavy rain causes delays → ETAs recalculated with 1.5× factor' },
  { label: 'New Emergency', desc: 'Mass casualty event arrives → AI allocates remaining resources' },
];

export default function Overview() {
  const [simStep, setSimStep] = useState(-1);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const { data: stats, mutate: mutateStats } = useSWR('/dashboard/stats', fetcher, { refreshInterval: 5000 });
  const { data: incidents, mutate: mutateInc } = useSWR('/incidents', fetcher, { refreshInterval: 5000 });
  const { data: ambulances, mutate: mutateAmb } = useSWR('/ambulances', fetcher, { refreshInterval: 5000 });
  const { data: hospitals, mutate: mutateHosp } = useSWR('/hospitals', fetcher, { refreshInterval: 5000 });
  const { data: allocations } = useSWR('/allocation/active', fetcher, { refreshInterval: 5000 });
  const { data: alerts } = useSWR('/dashboard/alerts', fetcher, { refreshInterval: 3000 });

  const refreshAll = useCallback(() => {
    mutateStats(); mutateInc(); mutateAmb(); mutateHosp();
  }, [mutateStats, mutateInc, mutateAmb, mutateHosp]);

  const handleWsMessage = useCallback((msg) => {
    if (['incident_created', 'incident_updated', 'reallocation', 'ambulance_updated', 'hospital_updated', 'simulation_step'].includes(msg.type)) {
      refreshAll();
    }
  }, [refreshAll]);

  const { connected } = useWebSocket(handleWsMessage);

  const runScenario = async () => {
    setSimLoading(true);
    try {
      const res = await api.post('/simulation/scenario');
      setSimResult(res.data);
      setSimStep(0);
      refreshAll();
    } catch (e) { console.error(e); }
    setSimLoading(false);
  };

  const runStep = async () => {
    setSimLoading(true);
    try {
      const res = await api.post('/simulation/step');
      setSimResult(res.data);
      setSimStep((s) => s + 1);
      refreshAll();
    } catch (e) { console.error(e); }
    setSimLoading(false);
  };

  const resetSim = async () => {
    try {
      await api.post('/simulation/reset');
      setSimStep(-1); setSimResult(null);
      refreshAll();
    } catch (e) { console.error(e); }
  };

  const incList = Array.isArray(incidents) ? incidents : [];
  const ambList = Array.isArray(ambulances) ? ambulances : [];
  const hospList = Array.isArray(hospitals) ? hospitals : [];
  const allocList = Array.isArray(allocations) ? allocations : [];
  const alertList = Array.isArray(alerts) ? alerts : [];

  const activeIncidents = incList.filter((i) => i.status === 'active');
  const recentIncidents = [...incList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
  const unreadAlerts = alertList.filter((a) => !a.is_read);

  return (
    <Layout>
      <TopBar
        title="Emergency Command Centre"
        subtitle="Real-time situational awareness — Bangalore City"
        wsConnected={connected}
        alertCount={unreadAlerts.length}
      />
      <main className="flex-1 p-6 overflow-y-auto">

        {/* KPI Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard icon={AlertTriangle} label="Active Incidents" value={stats?.total_active_incidents ?? '—'} color="#DC2626" />
          <StatCard icon={AlertTriangle} label="Critical Emergencies" value={stats?.critical_count ?? '—'} color="#F97316" />
          <StatCard icon={Truck} label="Available Ambulances" value={stats?.available_ambulances ?? '—'} color="#22C55E" />
          <StatCard icon={BedDouble} label="Available Hospital Beds" value={stats?.available_hospital_beds ?? '—'} color="#3B82F6" />
        </div>

        {/* Map + Right Panel */}
        <div className="flex gap-5 mb-5" style={{ height: 500 }}>
          {/* Map */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <EmergencyMap
              incidents={activeIncidents}
              ambulances={ambList}
              hospitals={hospList}
              allocations={allocList}
            />
          </div>

          {/* Right Panel */}
          <div className="w-72 flex flex-col gap-4 overflow-y-auto">

            {/* Recent Incidents */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex-shrink-0"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" /> Recent Incidents
              </h3>
              <div className="space-y-2">
                {recentIncidents.length === 0 && (
                  <p className="text-xs text-gray-400 py-2 text-center">No incidents yet</p>
                )}
                {recentIncidents.map((inc) => (
                  <div key={inc.id} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: SEVERITY_COLORS[inc.severity] || '#888' }}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate">
                        {INCIDENT_ICONS[inc.incident_type]} {inc.incident_type} — {inc.priority}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(inc.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                      inc.status === 'active' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>{inc.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hospital Status */}
            <div className="bg-white rounded-xl border border-gray-100 p-4"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" /> Hospital Capacity
              </h3>
              <div className="space-y-3">
                {hospList.map((h) => {
                  const pct = h.total_beds > 0 ? Math.round((1 - h.available_beds / h.total_beds) * 100) : 0;
                  const barColor = pct > 80 ? '#DC2626' : pct > 60 ? '#F97316' : '#22C55E';
                  return (
                    <div key={h.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-700 font-medium truncate pr-2">{h.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{h.available_beds} free</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: barColor }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="rounded-xl p-4 text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#1E1E2E 0%,#2D2D44 100%)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-red-400" />
                <span className="font-semibold text-sm">AI Recommendations</span>
              </div>
              {allocList.length === 0 && (
                <p className="text-xs text-gray-500">No active allocations</p>
              )}
              {allocList.slice(0, 3).map((alloc) => (
                <div key={alloc.id} className="mb-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                    {alloc.allocation_reason}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-green-400 font-medium">
                      ⏱ {alloc.estimated_time_minutes?.toFixed(1)} min
                    </span>
                    <span className="text-xs text-blue-400">
                      {alloc.distance_km?.toFixed(1)} km
                    </span>
                    {alloc.is_reallocated && (
                      <span className="text-xs text-orange-400">↺ Reallocated</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Alerts Ticker */}
        {unreadAlerts.length > 0 && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 overflow-hidden">
            <span className="text-xs font-bold text-red-700 uppercase tracking-widest whitespace-nowrap flex-shrink-0">
              🔴 LIVE
            </span>
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
              {unreadAlerts.slice(0, 8).map((a) => (
                <span key={a.id} className="text-xs text-red-700 whitespace-nowrap border-l border-red-200 pl-4 first:border-0 first:pl-0">
                  {a.message}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Demo Scenario Panel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Dynamic Reallocation Demo</h3>
                <p className="text-xs text-gray-500">Step through the YUKTIK 2026 intelligent allocation scenario</p>
              </div>
            </div>
            <button onClick={resetSim}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Step Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {SCENARIO_STEPS.map((step, i) => {
              const isDone = simStep >= i;
              const isCurrent = simStep === i - 1;
              const isFirst = i === 0;
              const isClickable = isFirst ? simStep === -1 : simStep === i - 1;

              return (
                <div key={i} className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={isFirst ? runScenario : runStep}
                    disabled={simLoading || !isClickable}
                    title={step.desc}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                      isDone
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : isClickable
                        ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm'
                        : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                    } ${simLoading && isClickable ? 'opacity-70' : ''}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                      isDone ? 'border-green-500 text-green-600' :
                      isClickable ? 'border-white text-white' : 'border-gray-300 text-gray-400'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </span>
                    <span className="whitespace-nowrap">{step.label}</span>
                  </button>
                  {i < SCENARIO_STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Result */}
          {simResult && (
            <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="font-semibold text-gray-900 text-sm mb-2">
                Step {(simResult.step ?? 0) + 1}: {simResult.description}
              </div>
              <div className="space-y-1.5">
                {(simResult.changes || []).map((c, i) => (
                  <div key={i} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">▸</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
              {simResult.allocations && simResult.allocations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="text-xs font-medium text-gray-600 mb-2">Updated Allocations:</div>
                  {simResult.allocations.map((a, i) => (
                    <div key={i} className="text-xs text-gray-500 flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-700">Incident #{a.incident_id}</span>
                      <span>→ Ambulance #{a.ambulance_id}</span>
                      <span>→ Hospital #{a.hospital_id}</span>
                      <span className="text-blue-600">{a.estimated_time_minutes?.toFixed(1)} min</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}

