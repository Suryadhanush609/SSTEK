import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { User, MapPin, AlertCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import TopBar from '../components/layout/TopBar';
import { useWebSocket } from '../hooks/useWebSocket';
import { AMBULANCE_STATUS_COLORS } from '../utils/constants';
import EmergencyMap from '../components/map/EmergencyMap';
import api from '../utils/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'unavailable', label: 'Unavailable' },
];

export default function Ambulances() {
  const [filter, setFilter] = useState('all');
  const { data: ambulances, mutate } = useSWR('/ambulances', fetcher, { refreshInterval: 4000 });

  const handleMsg = useCallback((msg) => {
    if (msg.type === 'ambulance_updated') mutate();
  }, [mutate]);
  useWebSocket(handleMsg);

  const ambList = Array.isArray(ambulances) ? ambulances : [];
  const filtered = ambList.filter((a) => filter === 'all' || a.status === filter);

  const counts = {
    all: ambList.length,
    available: ambList.filter((a) => a.status === 'available').length,
    assigned: ambList.filter((a) => a.status === 'assigned').length,
    unavailable: ambList.filter((a) => a.status === 'unavailable').length,
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/ambulances/${id}/status`, { status });
      mutate();
    } catch (e) { console.error(e); }
  };

  return (
    <Layout>
      <TopBar title="Ambulance Fleet" subtitle="Real-time ambulance tracking and status management" />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex gap-5">

          {/* Fleet List */}
          <div className="flex-1">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-5 w-fit"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {STATUS_TABS.map((t) => (
                <button key={t.key} onClick={() => setFilter(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === t.key ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-900'
                  }`}>
                  {t.label}
                  <span className={`text-xs px-1.5 rounded-full font-semibold ${
                    filter === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{counts[t.key]}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((amb) => {
                const statusColor = AMBULANCE_STATUS_COLORS[amb.status] || '#888';
                return (
                  <div key={amb.id} className="bg-white rounded-xl border border-gray-100 p-5 transition-all hover:shadow-md"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: statusColor + '18' }}>
                          🚑
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{amb.unit_number}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3" /> {amb.driver_name}
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold text-white capitalize"
                        style={{ backgroundColor: statusColor }}>
                        {amb.status}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {amb.latitude?.toFixed(4)}°N, {amb.longitude?.toFixed(4)}°E
                    </div>

                    {/* Active Incident */}
                    {amb.current_incident_id && (
                      <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-800 flex items-center gap-1.5 mb-3">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Responding to Incident #{amb.current_incident_id}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-50">
                      {amb.status !== 'available' && (
                        <button onClick={() => updateStatus(amb.id, 'available')}
                          className="flex-1 py-2 text-xs font-medium border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-all">
                          Mark Available
                        </button>
                      )}
                      {amb.status !== 'unavailable' && (
                        <button onClick={() => updateStatus(amb.id, 'unavailable')}
                          className="flex-1 py-2 text-xs font-medium border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-all">
                          Mark Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-2 text-center py-16 text-gray-400">
                  <span className="text-4xl mb-3 block">🚑</span>
                  <p className="text-sm">No ambulances in this category</p>
                </div>
              )}
            </div>
          </div>

          {/* Mini Map */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden sticky top-6"
              style={{ height: 480, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="px-4 py-3 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-700">Fleet Location Map</span>
              </div>
              <div style={{ height: 'calc(100% - 44px)' }}>
                <EmergencyMap ambulances={ambList} incidents={[]} hospitals={[]} allocations={[]} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

