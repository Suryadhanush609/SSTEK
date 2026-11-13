import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen overflow-hidden">
        {children}
      </div>
    </div>
  );
}

