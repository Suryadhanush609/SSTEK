import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Overview from './pages/Overview';
import Incidents from './pages/Incidents';
import Ambulances from './pages/Ambulances';
import Hospitals from './pages/Hospitals';
import Allocation from './pages/Allocation';
import History from './pages/History';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/ambulances" element={<Ambulances />} />
        <Route path="/hospitals" element={<Hospitals />} />
        <Route path="/allocation" element={<Allocation />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}
