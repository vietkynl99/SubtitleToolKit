import React from 'react';
import { ICONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  progress: number;
  hasProject: boolean;
  onClearProject: () => void;
  onExportProject: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, progress, hasProject, onClearProject, onExportProject }) => {
  // Requirement 2: Mandatory Flat Menu Order v1.7.0
  const menuItems = [
    { id: 'editor', label: 'Editor', icon: ICONS.File },
    { id: 'file-tools', label: 'File Tools', icon: ICONS.Tools },
    { id: 'settings', label: 'Settings', icon: ICONS.Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-200">
      {/* Sidebar */}
      <aside className="w-14 sm:w-16 md:w-56 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-sm">
        <div className="p-3 sm:p-4 flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">S</div>
          <span className="hidden md:block font-bold text-lg tracking-tight">Subtitle Toolkit</span>
        </div>
        
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                activeTab === item.id 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="hidden md:block font-medium truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer Area */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Requirement 3: Clear Current Project button above Progress Bar */}
          {hasProject && (
            <>
              <button 
                onClick={onClearProject}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all border border-rose-500/20 group"
              >
                <span className="transition-transform group-hover:rotate-90">{ICONS.Delete}</span>
                <span className="hidden md:block">Clear Project</span>
              </button>
              <button
                onClick={onExportProject}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all border border-emerald-500/20"
              >
                <span>{ICONS.Export}</span>
                <span className="hidden md:block">Export</span>
              </button>
            </>
          )}

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
