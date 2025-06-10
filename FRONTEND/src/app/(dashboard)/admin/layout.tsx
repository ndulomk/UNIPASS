'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import AdminSidebar from '@/components/Sidebar';
import AdminHeader from '@/components/AdminHeader';
// Icons for header/sidebar toggles
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const XMarkIconLarge = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;


export default function AdminLayout({ children }: { children: ReactNode }) {
    const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const APP_NAME = "Gestão Académica"; // Or fetch from config

    // Effect to close mobile sidebar on wider screens if it was left open
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) { // md breakpoint
                setIsMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
            {/* Mobile Header - only shown on md and below, part of AdminHeader logic */}
            {/* This AdminHeader is designed to be always visible */}
            <AdminHeader
                isCollapsed={isDesktopSidebarCollapsed}
                onToggleSidebar={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            />
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside
                    className={`hidden md:flex flex-col sticky top-0 h-[calc(100vh-var(--header-height,65px))]  ${
                        isDesktopSidebarCollapsed ? 'w-20' : 'w-64'
                    } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out`}
                    style={{ '--header-height': '65px' } as React.CSSProperties} // Assuming header height approx 65px
                >
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 min-h-[64px]">
                        {!isDesktopSidebarCollapsed && <span className="text-xl font-semibold truncate text-gray-800 dark:text-white">{APP_NAME}</span>}
                        <button
                            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            aria-label={isDesktopSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
                        >
                            {isDesktopSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                       <AdminSidebar isCollapsed={isDesktopSidebarCollapsed} appName={APP_NAME}/>
                    </div>
                </aside>

                {/* Mobile Sidebar (Overlay) */}
                {isMobileSidebarOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-30 bg-black/50 md:hidden"
                            onClick={() => setIsMobileSidebarOpen(false)}
                            aria-hidden="true"
                        />
                        {/* Sidebar Panel */}
                        <div
                            className="fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out md:hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-xl"
                            style={{ transform: isMobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
                        >
                            <AdminSidebar isMobile closeMobileSidebar={() => setIsMobileSidebarOpen(false)} appName={APP_NAME} isCollapsed={false} />
                        </div>
                    </>
                )}

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}