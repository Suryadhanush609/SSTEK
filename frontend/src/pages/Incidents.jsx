import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Plus, AlertTriangle, Filter } from 'lucide-react';
import Layout from '../components/layout/Layout';
import TopBar from '../components/layout/TopBar';
import IncidentCard from '../components/cards/IncidentCard';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../utils/api';

const fetcher = (url) => api.get(url).then((r) => r.data);

const FILTERS = [
  { key: 'all', label: 'All Incidents' },
  { key: 'active', label: 'Active' },
  { key: 'critical', label: 'Critical' },
  { key: 'resolved', label: 'Resolved' },
];

const DEFAULT_FORM = {
  incident_type: 'accident',
  description: '',
  latitude: '12.9716',
  longitude: '77.5946',
  affected_people: '1',
};

export default function Incidents() {
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitError, setSubmitError] = useState('');

  const { data: incidents, mutate } = useSWR('/incidents', fetcher, { refreshInterval: 5000 });

  const handleMsg = useCallback((msg) => {
    if (['incident_created', 'incident_updated'].includes(msg.type)) mutate();
  }, [mutate]);
  useWebSocket(handleMsg);

  const incList = Array.isArray(incidents) ? incidents : [];

  const filtered = incList.filter((i) => {
    if (filter === 'all') return true;
    if (filter === 'active') return i.status === 'active';
    if (filter === 'critical') return i.priority === 'critical';
    if (filter === 'resolved') return i.status === 'resolved';
    return true;
  });

  const counts = {
    all: incList.length,
    active: incList.filter((i) => i.status === 'active').length,
    critical: incList.filter((i) => i.priority === 'critical').length,
    resolved: incList.filter((i) => i.status === 'resolved').length,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!form.description.trim()) { setSubmitError('Description is required'); return; }
    setSubmitting(true);
    try {
      await api.post('/incidents/report', {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        affected_people: parseInt(form.affected_people, 10),
      });
      setShowForm(false);
      setForm(DEFAULT_FORM);
      mutate();
    } catch (e) {
      setSubmitError(e.response?.data?.detail || 'Failed to report incident');
    }
    setSubmitting(false);
  };

  return (
    <Layout>
      <TopBar title="Incident Management" subtitle="Report and track emergency incidents" />
      <main className="flex-1 p-6 overflow-y-auto">

        {/* Controls */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f.key ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-900'
                }`}>
                {f.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>

          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Report Emergency
          </button>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No incidents in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((inc) => <IncidentCard key={inc.id} incident={inc} />)}
          </div>
        )}

        {/* Report Modal */}
        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Report Emergency</h2>
                  <p className="text-xs text-gray-500 mt-0.5">AI will auto-classify severity and allocate resources</p>
                </div>
                <button onClick={() => { setShowForm(false); setSubmitError(''); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all text-lg">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Emergency Type</label>
                    <select value={form.incident_type}
                      onChange={(e) => setForm({ ...form, incident_type: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                      <option value="accident">🚗 Road Accident</option>
                      <option value="medical">❤️ Medical Emergency</option>
                      <option value="fire">🔥 Fire Emergency</option>
                      <option value="flood">🌊 Flood Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">People Affected</label>
                    <input type="number" min="1" max="1000" value={form.affected_people}
                      onChange={(e) => setForm({ ...form, affected_people: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Describe the emergency situation in detail..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
                    <input type="text" value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      placeholder="12.9716"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
                    <input type="text" value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      placeholder="77.5946"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 border border-blue-100">
                  🤖 AI will automatically predict severity, priority, and allocate the nearest available ambulance and hospital.
                </div>

                {submitError && (
                  <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700 border border-red-100">
                    ⚠️ {submitError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowForm(false); setSubmitError(''); }}
                    className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm">
                    {submitting ? 'Reporting...' : '🚨 Report Emergency'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

