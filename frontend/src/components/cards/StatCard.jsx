export default function StatCard({ icon: Icon, label, value, sub, color = '#DC2626' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '18' }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-gray-900 leading-none">{value ?? '—'}</div>
        <div className="text-sm text-gray-500 mt-1 leading-tight">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

