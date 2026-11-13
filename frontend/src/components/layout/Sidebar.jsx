import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Truck, Building2, Brain, History, Zap,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/ambulances', icon: Truck, label: 'Ambulances' },
  { to: '/hospitals', icon: Building2, label: 'Hospitals' },
  { to: '/allocation', icon: Brain, label: 'AI Allocation' },
  { to: '/history', icon: History, label: 'History' },
];

export default function Sidebar() {
  return (
    <div className="fixed left-0 top-0 h-full w-56 flex flex-col z-50 shadow-xl"
      style={{ background: '#1E1E2E' }}>
      {/* Logo */}
      <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight tracking-wide">YUKTIK</div>
            <div className="text-xs" style={{ color: '#6B7280' }}>Emergency 2026</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 mt-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-red-600 text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="text-xs text-center" style={{ color: '#4B5563' }}>
          AI Emergency Platform v1.0
        </div>
      </div>
    </div>
  );
}

