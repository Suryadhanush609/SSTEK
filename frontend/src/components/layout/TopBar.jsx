import { Bell, Wifi, WifiOff } from 'lucide-react';

export default function TopBar({ title, subtitle, wsConnected = false, alertCount = 0 }) {
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* WS Status */}
        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
          wsConnected
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-gray-50 text-gray-500 border border-gray-200'
        }`}>
          {wsConnected ? (
            <>
              <span className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></span>
              <Wifi className="w-3 h-3" /> Live
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <WifiOff className="w-3 h-3" /> Connecting
            </>
          )}
        </div>

        {/* Bell */}
        <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

