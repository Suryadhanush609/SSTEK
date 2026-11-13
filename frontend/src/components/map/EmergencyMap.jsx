import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { SEVERITY_COLORS, AMBULANCE_STATUS_COLORS, INCIDENT_ICONS } from '../../utils/constants';

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: null,
  iconUrl: null,
  shadowUrl: null,
});

function makeAmbIcon(status) {
  const color = AMBULANCE_STATUS_COLORS[status] || '#888';
  return L.divIcon({
    html: `<div style="
      background:${color};
      width:30px;height:30px;
      border-radius:50%;
      border:2.5px solid white;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      cursor:pointer;
    ">🚑</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    className: '',
  });
}

const hospIcon = L.divIcon({
  html: `<div style="
    background:#2563EB;
    width:30px;height:30px;
    border-radius:7px;
    border:2.5px solid white;
    display:flex;align-items:center;justify-content:center;
    font-size:14px;
    box-shadow:0 2px 8px rgba(0,0,0,0.25);
    cursor:pointer;
  ">🏥</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  className: '',
});

export default function EmergencyMap({
  incidents = [],
  ambulances = [],
  hospitals = [],
  allocations = [],
}) {
  // Build routes from allocations
  const routes = allocations
    .filter((a) => a.ambulance_id && a.hospital_id && a.incident_id)
    .map((alloc) => {
      const inc = incidents.find((i) => i.id === alloc.incident_id);
      const amb = ambulances.find((a) => a.id === alloc.ambulance_id);
      const hosp = hospitals.find((h) => h.id === alloc.hospital_id);
      if (!inc || !amb || !hosp) return null;
      return {
        key: alloc.id,
        points: [
          [amb.latitude, amb.longitude],
          [inc.latitude, inc.longitude],
          [hosp.latitude, hosp.longitude],
        ],
        color: SEVERITY_COLORS[inc.severity] || '#DC2626',
      };
    })
    .filter(Boolean);

  return (
    <MapContainer
      center={[12.9716, 77.5946]}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
      />

      {/* Incident Markers */}
      {incidents.map((inc) => (
        <CircleMarker
          key={inc.id}
          center={[inc.latitude, inc.longitude]}
          radius={Math.max(9, Math.min(20, (inc.affected_people || 1) * 1.2))}
          pathOptions={{
            fillColor: SEVERITY_COLORS[inc.severity] || '#DC2626',
            color: 'white',
            weight: 2,
            fillOpacity: 0.85,
          }}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {INCIDENT_ICONS[inc.incident_type] || '🚨'} {inc.incident_type?.toUpperCase()} EMERGENCY
              </div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>
                Severity: {inc.severity}/5 &nbsp;|&nbsp; Priority: <strong>{inc.priority}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>
                Affected: {inc.affected_people} people
              </div>
              <div style={{ fontSize: 11, color: '#777' }}>{inc.description}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Ambulance Markers */}
      {ambulances.map((amb) => (
        <Marker key={amb.id} position={[amb.latitude, amb.longitude]} icon={makeAmbIcon(amb.status)}>
          <Popup>
            <div style={{ minWidth: 150 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>🚑 {amb.unit_number}</div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>
                Driver: {amb.driver_name}
              </div>
              <div style={{ fontSize: 12 }}>
                Status:{' '}
                <span style={{ color: AMBULANCE_STATUS_COLORS[amb.status], fontWeight: 600 }}>
                  {amb.status}
                </span>
              </div>
              {amb.current_incident_id && (
                <div style={{ fontSize: 11, color: '#F97316', marginTop: 4 }}>
                  → Incident #{amb.current_incident_id}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Hospital Markers */}
      {hospitals.map((hosp) => (
        <Marker key={hosp.id} position={[hosp.latitude, hosp.longitude]} icon={hospIcon}>
          <Popup>
            <div style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>🏥 {hosp.name}</div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>
                Beds: {hosp.available_beds}/{hosp.total_beds} available
              </div>
              <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>
                ICU: {hosp.icu_available}/{hosp.icu_total} available
              </div>
              <div style={{ fontSize: 11 }}>
                Status:{' '}
                <span style={{
                  color: hosp.status === 'operational' ? '#22C55E' : '#DC2626',
                  fontWeight: 600
                }}>
                  {hosp.status}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route Lines */}
      {routes.map((route) => (
        <Polyline
          key={route.key}
          positions={route.points}
          pathOptions={{
            color: route.color,
            weight: 2.5,
            opacity: 0.7,
            dashArray: '8 6',
          }}
        />
      ))}
    </MapContainer>
  );
}

