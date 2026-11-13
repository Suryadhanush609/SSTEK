import { formatDistanceToNow } from 'date-fns';
import { MapPin, Users, Clock } from 'lucide-react';
import { SEVERITY_COLORS, SEVERITY_LABELS, INCIDENT_ICONS, PRIORITY_COLORS, INCIDENT_TYPE_LABELS } from '../../utils/constants';

export default function IncidentCard({ incident, onClick }) {
  const timeAgo = incident.created_at
    ? formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })
    : '';

  const priorityColor = PRIORITY_COLORS[incident.priority] || '#888';
  const severityColor = SEVERITY_COLORS[incident.severity] || '#888';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer transition-all hover:shadow-md hover:border-red-100"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{INCIDENT_ICONS[incident.incident_type] || '🚨'}</span>
          <div>
            <div className="font-semibold text-gray-900 text-sm leading-tight">
              {INCIDENT_TYPE_LABELS[incident.incident_type] || 'Emergency'}
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />{timeAgo}
            </div>
          </div>
        </div>
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white flex-shrink-0 capitalize"
          style={{ backgroundColor: priorityColor }}
        >
          {incident.priority}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
        {incident.description || 'No description provided.'}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {incident.latitude?.toFixed(4)}, {incident.longitude?.toFixed(4)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3 flex-shrink-0" />
          {incident.affected_people} affected
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColor }}></div>
          <span className="text-xs text-gray-500">
            Severity {incident.severity}/5 — {SEVERITY_LABELS[incident.severity] || 'Unknown'}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          incident.status === 'active'
            ? 'bg-red-50 text-red-700'
            : incident.status === 'resolved'
            ? 'bg-green-50 text-green-700'
            : 'bg-yellow-50 text-yellow-700'
        }`}>
          {incident.status}
        </span>
      </div>
    </div>
  );
}

