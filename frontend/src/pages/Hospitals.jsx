import { useCallback } from 'react';
import useSWR from 'swr';
import { BedDouble, Activity, MapPin, TrendingUp } from 'lucide-react';
import Layout from '../components/layout/Layout';
import TopBar from '../components/layout/TopBar';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../utils/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

function CapacityBar({ value, total, label }) {
  const pct = total > 0 ? Math.round((1 - value / total) * 100) : 0;
  const color = pct > 85 ? '#DC2626' : pct > 65 ? '#F97316' : '#22C55E';
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs text-gray-600">
        <span className="font-medium">{label}</span>
        <span>
          <span className="font-semibold text-gray-900">{value}</span>
          <span className="text-gray-400"> / {total} available</span>
        </span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs text-right mt-1" style={{ color }}>
        {pct}% occupied
      </div>
    </div>
  );
}

export default function Hospitals() {
  const { data: hospitals, mutate } = useSWR('/hospitals', fetcher, { refreshInterval: 5000 });

  const handleMsg = useCallback((msg) => {
    if (msg.type === 'hospital_updated') mutate();
  }, [mutate]);
  useWebSocket(handleMsg);

  const hospList = Array.isArray(hospitals) ? hospitals : [];

  const totalBeds = hospList.reduce((s, h) => s + h.total_beds, 0);
  const availBeds = hospList.reduce((s, h) => s + h.available_beds, 0);
  const totalICU = hospList.reduce((s, h) => s + h.icu_total, 0);
  const availICU = hospList.reduce((s, h) => s + h.icu_available, 0);

  return (
    <Layout>
      <TopBar title="Hospital Management" subtitle="Real-time hospital capacity and resource monitoring" />
      <main className="flex-1 p-6 overflow-y-auto">

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Beds', value: totalBeds, icon: BedDouble, color: '#3B82F6' },
            { label: 'Available Beds', value: availBeds, icon: BedDouble, color: '#22C55E' },
            { label: 'Total ICU Beds', value: totalICU, icon: Activity, color: '#8B5CF6' },
            { label: 'Available ICU', value: availICU, icon: Activity, color: availICU < 10 ? '#DC2626' : '#22C55E' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: s.color + '18' }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Hospital Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hospList.map((h) => {
            const bedOccupancy = h.total_beds > 0 ? Math.round((1 - h.available_beds / h.total_beds) * 100) : 0;
            const statusColor = h.status === 'operational'
              ? { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
              : h.status === 'full'
              ? { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
              : { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };

            return (
              <div key={h.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      🏥
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm leading-tight">{h.name}</div>
                      {h.address && (
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> {h.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border flex-shrink-0
                    ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                    {h.status}
                  </span>
                </div>

                {/* Capacity Bars */}
                <div className="space-y-4 mb-5">
                  <CapacityBar value={h.available_beds} total={h.total_beds} label="General Beds" />
                  <CapacityBar value={h.icu_available} total={h.icu_total} label="ICU Beds" />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                  <div className="text-center bg-gray-50 rounded-lg py-2.5">
                    <div className="text-lg font-bold text-gray-900">{h.available_beds}</div>
                    <div className="text-xs text-gray-500">Free Beds</div>
                  </div>
                  <div className="text-center bg-gray-50 rounded-lg py-2.5">
                    <div className={`text-lg font-bold ${h.icu_available === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {h.icu_available}
                    </div>
                    <div className="text-xs text-gray-500">Free ICU</div>
                  </div>
                </div>

                {/* ICU Warning */}
                {h.icu_available === 0 && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium text-center">
                    ⚠️ ICU at Full Capacity — Will Not Accept Critical Cases
                  </div>
                )}
              </div>
            );
          })}
          {hospList.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <span className="text-4xl mb-3 block">🏥</span>
              <p className="text-sm">Loading hospital data...</p>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}

