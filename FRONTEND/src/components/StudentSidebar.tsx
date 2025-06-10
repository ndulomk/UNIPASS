"use client";

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/authSlice';
import {
  LayoutDashboard,
  BarChart3,
  FileArchive,
  GraduationCap,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

interface StudentSidebarProps {
  studentName?: string;
  courseName?: string;
}

const StudentSidebar = ({ studentName, courseName }: StudentSidebarProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const navItems = [
    { href: '/student/dashboard', label: 'Painel Principal', icon: LayoutDashboard },
    { href: '/student/performance', label: 'Desempenho', icon: BarChart3 },
    { href: '/student/documents', label: 'Documentos', icon: FileArchive },
  ];

  const isActive = (path: string) => {
    return pathname === path || (path !== '/student/dashboard' && pathname?.startsWith(path));
  };

  const handleLogout = async () => {
    try {
      dispatch(logout());
      toast.success('Logged out successfully');
      await router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <aside className="w-72 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 p-6 flex flex-col fixed h-full shadow-2xl">
      <div className="mb-10 text-center">
        <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center mb-3 shadow-lg">
          <GraduationCap size={48} className="text-white" />
        </div>
        <h2 className="text-xl font-semibold">{user?.first_name || studentName || 'Aluno'}</h2>
        <p className="text-sm text-sky-300">{courseName || 'Curso não definido'}</p>
      </div>

      <nav className="flex-grow space-y-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out group
              ${
                isActive(item.href)
                  ? 'bg-sky-500 text-white shadow-md scale-105'
                  : 'hover:bg-slate-700 hover:text-sky-300 hover:shadow-sm'
              }`}
          >
            <item.icon
              size={22}
              className={`transition-colors ${
                isActive(item.href) ? 'text-white' : 'text-slate-400 group-hover:text-sky-300'
              }`}
            />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-600 hover:text-white w-full transition-colors group"
        >
          <LogOut size={20} className="text-slate-400 group-hover:text-white" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default StudentSidebar;