import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Brain, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import TopBar from '../components/layout/TopBar';
import AllocationCard from '../components/cards/AllocationCard';
import { useWebSocket } from '../hooks/useWebSocket';
import { INCIDENT_ICONS, PRIORITY_COLORS, INCIDENT_TYPE_LABELS } from '../utils/constants';
import api from '../utils/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function Allocation() {
  const [triggering, setTriggering] = useState(null);

  const { data: incidents, mutate: mutateInc } = useSWR('/incidents', fetcher, { refreshInterval: 5000 });
  const { data: allocations, mutate: mutateAlloc } = useSWR('/allocation/active', fetcher, { refreshInterval: 5000 });
  const { data: ambulances } = useSWR('/ambulances', fetcher, { refreshInterval: 5000 });
  const { data: hospitals } = useSWR('/hospitals', fetcher, { refreshInterval: 5000 });

  const handleMsg = useCallback((msg) => {
    if (['reallocation', 'allocation_created', 'incident_updated', 'ambulance_updated'].includes(msg.type)) {
      mutateInc(); mutateAlloc();
    }
  }, [mutateInc, mutateAlloc]);
  useWebSocket(handleMsg);

  const incList = Array.isArray(incidents) ? incidents : [];
  const allocList = Array.isArray(allocations) ? allocations : [];
  const ambList = Array.isArray(ambulances) ? ambulances : [];
  const hospList = Array.isArray(hospitals) ? hospitals : [];

  const activeIncidents = incList.filter((i) => i.status === 'active');

  const triggerAlloc = async (incidentId) => {
    setTriggering(incidentId);
    try {
      await api.post(`/allocation/trigger/${incidentId}`);
      mutateAlloc(); mutateInc();
    } catch (e) { console.error(e); }
    setTriggering(null);
  };

  // Helper: get ambulance unit number
  const getAmbUnit = (id) => ambList.find((a) => a.id === id)?.unit_number || `#${id}`;
  const getHospName = (id) => hospList.find((h) => h.id === id)?.name || `#${id}`;

  return (
    <Layout>
      <TopBar title="AI Resource Allocation" subtitle="Intelligent emergency resource assignment engine" />
      <main className="flex-1 p-6 overflow-y-auto">

        {/* AI Engine Banner */}
        <div className="rounded-xl p-5 text-white mb-6 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg,#1E1E2E 0%,#2D2D44 100%)' }}>
          <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <div className="font-bold text-base">YUKTIK AI Allocation Engine</div>
            <div className="text-sm text-gray-400 mt-0.5">
              Automatically selects the nearest ambulance, best-fit hospital, and fastest route.
              Dynamically reallocates when conditions change.
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium">{activeIncidents.length} Active</span>
          </div>
        </div>

        {activeIncidents.length === 0 ? (
          <div className="text-center py-20">
            <Brain className="w-12 h-12 mx-auto mb-4 text-gray-200" />
            <p className="text-gray-500 font-medium">No active incidents requiring allocation</p>
            <p className="text-sm text-gray-400 mt-1">Go to Incidents to report a new emergency</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {activeIncidents.map((inc) => {
              const alloc = allocList.find((a) => a.incident_id === inc.id);
              const priorityColor = PRIORITY_COLORS[inc.priority] || '#888';

              return (
                <div key={inc.id} className="bg-white rounded-xl border border-gray-100 p-5"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {/* Incident Header */}
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-50">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none">{INCIDENT_ICONS[inc.incident_type] || '🚨'}</span>
                      <div>
                        <div className="font-bold text-gray-900">
                          {INCIDENT_TYPE_LABELS[inc.incident_type] || 'Emergency'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          #{inc.id} &nbsp;·&nbsp; {inc.affected_people} people affected &nbsp;·&nbsp;
                          Severity {inc.severity}/5
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{inc.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white capitalize"
                        style={{ backgroundColor: priorityColor }}>
                        {inc.priority}
                      </span>
                      <button
                        onClick={() => triggerAlloc(inc.id)}
                        disabled={triggering === inc.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-all">
                        <RefreshCw className={`w-3 h-3 ${triggering === inc.id ? 'animate-spin' : ''}`} />
                        Reallocate
                      </button>
                    </div>
                  </div>

                  {/* Allocation */}
                  {alloc ? (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                        Current Allocation
                      </div>
                      {/* Summary Line */}
                      <div className="flex items-center gap-3 mb-3 bg-green-50 rounded-lg px-3 py-2 border border-green-100 text-xs text-green-800">
                        <span>🚑 {getAmbUnit(alloc.ambulance_id)}</span>
                        <span className="text-green-400">→</span>
                        <span>🏥 {getHospName(alloc.hospital_id)}</span>
                        <span className="ml-auto font-semibold">⏱ {alloc.estimated_time_minutes?.toFixed(1)} min</span>
                      </div>
                      <AllocationCard allocation={alloc} />
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                      <p className="text-sm text-gray-500 font-medium">No allocation yet</p>
                      <button onClick={() => triggerAlloc(inc.id)}
                        disabled={triggering === inc.id}
                        className="mt-3 px-5 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-all shadow-sm">
                        {triggering === inc.id ? 'Allocating...' : '🤖 Allocate Now'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </Layout>
  );
}

