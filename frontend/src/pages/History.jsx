import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { History as HistoryIcon } from 'lucide-react';
import Layout from '../components/layout/Layout';
import TopBar from '../components/layout/TopBar';
import { INCIDENT_ICONS, PRIORITY_COLORS, INCIDENT_TYPE_LABELS } from '../utils/constants';
import api from '../utils/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function History() {
  const { data: history } = useSWR('/history', fetcher, { refreshInterval: 15000 });
  const { data: allocRecords } = useSWR('/allocation/records', fetcher, { refreshInterval: 15000 });

  const histList = Array.isArray(history) ? history : [];
  const allocList = Array.isArray(allocRecords) ? allocRecords : [];

  // Build enriched list: join incidents with their latest allocation
  const enriched = histList.map((inc) => {
    const alloc = allocList.filter((a) => a.incident_id === inc.id).sort((a, b) => b.id - a.id)[0];
    return { ...inc, alloc };
  });

  return (
    <Layout>
      <TopBar title="Incident History" subtitle="Past emergency records and allocation logs" />
      <main className="flex-1 p-6 overflow-y-auto">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Incidents', value: histList.length, color: '#3B82F6' },
            { label: 'Resolved', value: histList.filter((i) => i.status === 'resolved').length, color: '#22C55E' },
            { label: 'Reallocations Made', value: allocList.filter((a) => a.is_reallocated).length, color: '#F97316' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900 text-sm">All Incidents</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['ID', 'Type', 'Description', 'Priority', 'Affected', 'Status', 'Ambulance', 'Hospital', 'ETA', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enriched.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs font-medium">#{item.id}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 capitalize font-medium text-gray-900">
                        <span>{INCIDENT_ICONS[item.incident_type] || '🚨'}</span>
                        <span className="text-xs">{INCIDENT_TYPE_LABELS[item.incident_type] || item.incident_type}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-44">
                      <span className="text-xs line-clamp-2">{item.description}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white capitalize"
                        style={{ backgroundColor: PRIORITY_COLORS[item.priority] || '#888' }}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs text-center">{item.affected_people}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        item.status === 'resolved' ? 'bg-green-50 text-green-700' :
                        item.status === 'active' ? 'bg-red-50 text-red-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.alloc?.ambulance_id ? `Unit #${item.alloc.ambulance_id}` : item.assigned_ambulance_id ? `Unit #${item.assigned_ambulance_id}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.alloc?.hospital_id ? `Hosp #${item.alloc.hospital_id}` : item.assigned_hospital_id ? `Hosp #${item.assigned_hospital_id}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.alloc?.estimated_time_minutes ? `${item.alloc.estimated_time_minutes.toFixed(1)} min` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {item.created_at
                        ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
                        : '—'}
                    </td>
                  </tr>
                ))}
                {enriched.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-14 text-center text-gray-400 text-sm">
                      <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No incident history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </Layout>
  );
}

