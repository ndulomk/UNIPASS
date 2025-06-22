import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './Sidebar';
import AdminHeader from './AdminHeader';

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);
const XMarkIconLarge = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AdminLayout = () => {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const APP_NAME = "Gestão Académica";

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  console.debug('AdminLayout mounted - Sidebar collapsed:', isDesktopSidebarCollapsed, 'Mobile open:', isMobileSidebarOpen);

  return (
    <div className="h-screen flex flex-col bg-gray-100 max-[1px]:bg-gray-900">
      <AdminHeader
        isCollapsed={isDesktopSidebarCollapsed}
        onToggleSidebar={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`hidden md:flex flex-col sticky top-0 h-[calc(100vh-var(--header-height,65px))] ${
            isDesktopSidebarCollapsed ? 'w-20' : 'w-64'
          } bg-white max-[1px]:bg-gray-800 border-r border-gray-200 max-[1px]:border-gray-700 transition-all duration-300 ease-in-out`}
          style={{ '--header-height': '65px' }}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 max-[1px]:border-gray-700 min-h-[64px]">
            {!isDesktopSidebarCollapsed && (
              <span className="text-xl font-semibold truncate text-gray-800 max-[1px]:text-white">{APP_NAME}</span>
            )}
            <button
              onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              className="p-2 text-gray-600 max-[1px]:text-gray-300 hover:bg-gray-100 max-[1px]:hover:bg-gray-700 rounded-lg"
              aria-label={isDesktopSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {isDesktopSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AdminSidebar isCollapsed={isDesktopSidebarCollapsed} appName={APP_NAME} />
          </div>
        </aside>

        {isMobileSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            <div
              className="fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out md:hidden bg-white max-[1px]:bg-gray-800 border-r border-gray-200 max-[1px]:border-gray-700 shadow-xl"
              style={{ transform: isMobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
            >
              <AdminSidebar
                isMobile
                closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
                appName={APP_NAME}
                isCollapsed={false}
              />
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;