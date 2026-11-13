import { Truck, Building2, Clock, Navigation, AlertCircle } from 'lucide-react';

export default function AllocationCard({ allocation }) {
  if (!allocation) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Navigation className="w-4 h-4 text-indigo-600" />
        </div>
        <span className="font-semibold text-gray-900 text-sm">Allocation #{allocation.id}</span>
        {allocation.is_reallocated && (
          <span className="ml-auto px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full font-medium border border-orange-200">
            ↺ Reallocated
          </span>
        )}
      </div>

      {/* Assignment Details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Truck className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-gray-500">Ambulance:</span>
          <span className="font-medium text-gray-900">
            {allocation.ambulance_id ? `Unit #${allocation.ambulance_id}` : 'Unassigned'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-gray-500">Hospital:</span>
          <span className="font-medium text-gray-900">
            {allocation.hospital_id ? `Facility #${allocation.hospital_id}` : 'Unassigned'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-gray-500">ETA:</span>
          <span className="font-medium text-gray-900">
            {allocation.estimated_time_minutes?.toFixed(1)} min
          </span>
          <span className="text-gray-400 text-xs">({allocation.distance_km?.toFixed(1)} km)</span>
        </div>
      </div>

      {/* AI Reason */}
      {allocation.allocation_reason && (
        <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-800 leading-relaxed border border-indigo-100">
          🤖 <span className="font-medium">AI Reasoning:</span> {allocation.allocation_reason}
        </div>
      )}

      {/* Reallocation Reason */}
      {allocation.reallocation_reason && (
        <div className="bg-orange-50 rounded-lg p-3 text-xs text-orange-800 leading-relaxed border border-orange-100 mt-2">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          <span className="font-medium">Reallocation:</span> {allocation.reallocation_reason}
        </div>
      )}
    </div>
  );
}

