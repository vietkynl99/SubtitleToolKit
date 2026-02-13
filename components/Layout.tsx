
import React from 'react';
import { ICONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  progress: number;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, progress }) => {
  const menuItems = [
    { id: 'upload', label: 'Upload', icon: ICONS.Upload },
    { id: 'editor', label: 'Editor', icon: ICONS.File },
    { id: 'history', label: 'History', icon: ICONS.History },
    { id: 'settings', label: 'Settings', icon: ICONS.Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-200">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">S</div>
          <span className="hidden md:block font-bold text-lg tracking-tight">Subtitle Toolkit</span>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                activeTab === item.id 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span className="hidden md:block font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Global Progress</span>
            <span className="text-xs text-blue-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
