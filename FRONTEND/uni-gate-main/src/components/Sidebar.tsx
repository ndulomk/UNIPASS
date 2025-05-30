'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

// Simple SVG Icons (replace with your preferred icon library if available)
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m0 0A7.488 7.488 0 0112 20.253a7.488 7.488 0 01-5.268-2.023M12 6.253V3.75m0 2.5A7.488 7.488 0 0012 3.75a7.488 7.488 0 00-5.268 2.023m10.536 0l-2.101-2.101m2.101 2.101L12 6.253" /></svg>; // Simplified
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const CogIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;


interface NavItemType {
    path: string;
    title: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    children?: NavItemType[];
}

const navigation: NavItemType[] = [
    { path: "/admin/dashboard", title: "Dashboard", icon: HomeIcon },
    {
        path: "#gestao",
        title: "Gestão",
        icon: UsersIcon,
        children: [
            { path: "/admin/candidates", title: "Candidatos", icon: UsersIcon },
            { path: "/admin/enrollments", title: "Matrículas", icon: BookOpenIcon },
        ],
    },
    {
        path: "#academico",
        title: "Académico",
        icon: BookOpenIcon,
        children: [
            { path: "/admin/scheduling", title: "Agendar Provas", icon: CalendarIcon },
            { path: "/admin/exams", title: "Exames Criados", icon: BookOpenIcon },
            {path: "/admin/resultados", title:"Resultados", icon:BookOpenIcon}
        ]
    },
    {
        path: "#reports",
        title: "Relatórios",
        icon: ChartBarIcon,
        children: [
            { path: "/admin/results/all", title: "Todos Resultados", icon: ChartBarIcon },
            { path: "/admin/reports", title: "Gráfico de Matrículas", icon: ChartBarIcon },
        ],

    },
];


const NavLinkItem: React.FC<{ item: NavItemType; isCollapsed: boolean; isMobile?: boolean; closeSidebar?: () => void; }> = ({ item, isCollapsed, isMobile, closeSidebar }) => {
    const pathname = usePathname();
    const isActive = pathname === item.path || (item.path !== "/admin/dashboard" && pathname.startsWith(item.path));

    const handleClick = () => {
        if (isMobile && closeSidebar) {
            closeSidebar();
        }
    };
    
    return (
        <Link href={item.path} legacyBehavior>
            <a
                title={isCollapsed && !isMobile ? item.title : undefined}
                onClick={handleClick}
                className={`flex items-center p-3 my-1 rounded-lg transition-colors duration-150 ease-in-out group
                    ${isActive ? 'bg-blue-100 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                    ${isCollapsed && !isMobile ? 'justify-center' : 'gap-3'}`}
            >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? (isCollapsed && !isMobile ? 'text-blue-600 dark:text-blue-300' : 'text-blue-600 dark:text-blue-300') : (isCollapsed && !isMobile ? 'text-gray-500 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200')}`} />
                {(!isCollapsed || isMobile) && (
                    <span className="truncate flex-1">{item.title}</span>
                )}
            </a>
        </Link>
    );
};

const CollapsibleNavItem: React.FC<{ item: NavItemType; isCollapsed: boolean; isMobile?: boolean; closeSidebar?: () => void; }> = ({ item, isCollapsed, isMobile, closeSidebar }) => {
    const pathname = usePathname();
    const isParentActive = item.children?.some(child => pathname === child.path || pathname.startsWith(child.path));
    const [isOpen, setIsOpen] = useState(isParentActive || false);

    const handleToggle = () => {
        if (!isCollapsed || isMobile) {
            setIsOpen(!isOpen);
        }
    };
    
    // Auto open if a child is active
    React.useEffect(() => {
        if (isParentActive) {
            setIsOpen(true);
        }
    }, [pathname, isParentActive]);


    return (
        <div className="font-medium">
            <button
                onClick={handleToggle}
                title={isCollapsed && !isMobile ? item.title : undefined}
                className={`w-full flex items-center p-3 my-1 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 gap-3 transition-colors duration-150 ease-in-out group
                    ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between'}
                    ${isParentActive ? 'bg-gray-50 dark:bg-gray-700/50' : ''}
                `}
            >
                <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isParentActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}`} />
                    {(!isCollapsed || isMobile) && <span className="truncate">{item.title}</span>}
                </div>
                {(!isCollapsed || isMobile) && (
                    <ChevronRightIcon className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ease-in-out ${isOpen ? "rotate-90" : ""}`} />
                )}
            </button>

            {(!isCollapsed || isMobile) && isOpen && (
                <div className="mt-1 ml-4 pl-3 border-l border-gray-200 dark:border-gray-600 space-y-0.5">
                    {item.children?.map((child) => (
                        <NavLinkItem key={child.path} item={child} isCollapsed={false} isMobile={isMobile} closeSidebar={closeSidebar} />
                    ))}
                </div>
            )}
   
        </div>
    );
};


interface AdminSidebarProps {
    isCollapsed: boolean;
    isMobile?: boolean;
    closeMobileSidebar?: () => void; // For mobile
    appName?: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, isMobile, closeMobileSidebar, appName = "Admin Sistema" }) => {
    return (
        <div className={`h-full flex flex-col bg-white dark:bg-gray-800 shadow-lg ${isMobile ? "w-64" : ""}`}>
            {isMobile && (
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xl font-semibold text-gray-800 dark:text-white">{appName}</span>
                    <button
                        onClick={closeMobileSidebar}
                        className="p-1 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Fechar menu"
                    >
                        <XMarkIcon />
                    </button>
                </div>
            )}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {navigation.map((item) =>
                    item.children ? (
                        <CollapsibleNavItem key={item.title} item={item} isCollapsed={isCollapsed} isMobile={isMobile} closeSidebar={closeMobileSidebar} />
                    ) : (
                        <NavLinkItem key={item.title} item={item} isCollapsed={isCollapsed} isMobile={isMobile} closeSidebar={closeMobileSidebar}/>
                    )
                )}
            </nav>
            {!isMobile && (
                 <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
                        <img
                            src="https://via.placeholder.com/40/3B82F6/FFFFFF?text=A" 
                            alt="User Avatar"
                            className="w-8 h-8 rounded-full"
                        />
                        {!isCollapsed && (
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">Admin User</p>
                                <Link href="#" legacyBehavior>
                                    <a className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate">Ver Perfil</a>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSidebar;