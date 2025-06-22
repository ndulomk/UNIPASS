import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, FileCheck, LogOut, BookOpen } from 'lucide-react'

const Sidebar = ({ isCollapsed, isMobile, closeMobileSidebar, appName }) => {
  const location = useLocation()
const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/candidatos', label: 'Candidatos', icon: Users },
  { href: '/admin/resultados', label: 'Resultados', icon: FileCheck },
  { href: '/admin/exams/create', label: 'Agendar Prova', icon: FileCheck },
  { href: '/admin/exams', label: 'Todos exames', icon: FileCheck },
  { href: '/admin/content-matrices/create', label: 'Criar Matriz', icon: BookOpen },
];

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    window.location.href = '/login'
  }

  return (
    <div className="h-full flex flex-col">
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 max-[1px]:border-gray-700">
          <span className="text-xl font-semibold text-gray-800 max-[1px]:text-white">{appName}</span>
          <button
            onClick={closeMobileSidebar}
            className="p-2 text-gray-600 max-[1px]:text-gray-300 hover:bg-gray-100 max-[1px]:hover:bg-gray-700 rounded-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
              isActive(item.href)
                ? 'bg-sky-500 text-white'
                : 'text-gray-600 max-[1px]:text-gray-300 hover:bg-gray-100 max-[1px]:hover:bg-gray-700'
            }`}
          >
            <item.icon size={20} />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 max-[1px]:border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-2 w-full text-gray-600 max-[1px]:text-gray-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  )
}

export default Sidebar