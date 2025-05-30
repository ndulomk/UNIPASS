'use client';
import React from 'react';

interface AdminHeaderProps {
    isCollapsed: boolean;
    onToggleSidebar: () => void;
    onOpenMobileSidebar: () => void;
}

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;


const AdminHeader: React.FC<AdminHeaderProps> = ({ isCollapsed, onToggleSidebar, onOpenMobileSidebar }) => {
    return (
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <button
                        onClick={onOpenMobileSidebar}
                        className="md:hidden p-2 mr-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        aria-label="Abrir menu lateral"
                    >
                        <MenuIcon />
                    </button>
                </div>
                <div className="flex-1 text-center md:text-left">
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            <UserIcon />
                            <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-200">Admin User</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;