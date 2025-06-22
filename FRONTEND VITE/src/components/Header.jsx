import { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X, LogOut, User } from 'react-feather';
import { Link, useNavigate } from 'react-router-dom';

const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

const removeCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict;Secure`;
};

const NavLink = ({ to, children }) => (
  <Link
    to={to}
    className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 max-[1px]:text-gray-300 hover:bg-white/90 max-[1px]:hover:bg-gray-700/90 hover:text-blue-600 max-[1px]:hover:text-blue-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
  >
    {children}
  </Link>
);

const MobileNavLink = ({ to, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block px-4 py-3 rounded-lg text-gray-700 max-[1px]:text-gray-300 hover:bg-gray-100/80 max-[1px]:hover:bg-gray-700/80 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
  >
    {children}
  </Link>
);

const navItems = [
  { label: 'Início', to: '/' },
  { label: 'Funcionalidades', to: '/#features' },
  { label: 'Sobre Nós', to: '/#about' },
  { label: 'Contato', to: '/#contact' },
];

export default function Header() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Get auth data from cookies
  const token = getCookie('access_token');
  const userDataString = getCookie('userData');
  const enrollmentDataString = getCookie('enrollmentData');
  const candidateDataString = getCookie('candidateData');
  let user = null;
  let enrollment = null;
  let candidate = null;

  // Parse user, enrollment, and candidate data
  try {
    if (userDataString) user = JSON.parse(userDataString);
    if (enrollmentDataString) enrollment = JSON.parse(enrollmentDataString);
    if (candidateDataString) candidate = JSON.parse(candidateDataString);
  } catch (err) {
    console.error('Error parsing cookie data:', err);
    removeCookie('access_token');
    removeCookie('userData');
    removeCookie('enrollmentData');
    removeCookie('candidateData');
  }

  const isAuthenticated = !!(token && user);

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    removeCookie('access_token');
    removeCookie('userData');
    removeCookie('enrollmentData');
    removeCookie('candidateData');
    navigate('/');
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const navigateToDashboard = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
    } else if (user?.role === 'student' || enrollment) {
      navigate('/student/dashboard');
    } else if (candidate && !enrollment) {
      navigate('/');
    } else {
      navigate('/');
    }
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  return (
    <header className="fixed top-4 left-0 right-0 z-50 mx-auto max-w-[calc(100%-32px)] md:max-w-6xl">
      <div className={`bg-white/80 max-[1px]:bg-gray-900/80 backdrop-blur-lg border border-white/20 max-[1px]:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 ${mobileMenuOpen ? 'rounded-2xl' : 'rounded-full'}`}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-inner">
                <span className="text-white font-bold text-lg">UG</span>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 max-[1px]:from-blue-400 max-[1px]:to-indigo-400">
                UniPass
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              {navItems.map((item) => (
                <NavLink key={item.label} to={item.to}>{item.label}</NavLink>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-200/50 max-[1px]:hover:bg-gray-700/50 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Alternar modo escuro"
              >
                {theme === 'dark' ? <Sun size={18} className="text-yellow-300" /> : <Moon size={18} className="text-neutral-700" />}
              </button>

              {/* Desktop Auth Section */}
              <div className="hidden md:flex items-center space-x-2">
                {isAuthenticated && user ? (
                  <div className="relative user-menu">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 px-4 py-2 rounded-full hover:bg-white/90 max-[1px]:hover:bg-gray-700/90 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      aria-expanded={userMenuOpen}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                        <User size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 max-[1px]:text-gray-300">
                        {user.first_name || 'Usuário'}
                      </span>
                    </button>

                    {/* User Dropdown Menu */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white max-[1px]:bg-gray-800 rounded-lg shadow-lg border border-gray-200 max-[1px]:border-gray-700 py-1 z-50">
                        <div className="px-4 py-2 border-b border-gray-200 max-[1px]:border-gray-700">
                          <p className="text-sm font-medium text-gray-900 max-[1px]:text-gray-100">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-500 max-[1px]:text-gray-400">
                            {user.email}
                          </p>
                          <p className="text-xs text-blue-600 max-[1px]:text-blue-400 capitalize">
                            {user.role}
                          </p>
                        </div>
                        
                        <button
                          onClick={navigateToDashboard}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 max-[1px]:text-gray-300 hover:bg-gray-100 max-[1px]:hover:bg-gray-700 transition-colors"
                        >
                          {user.role === 'admin' 
                            ? 'Painel Admin' 
                            : enrollment 
                              ? 'Meu Painel' 
                              : candidate 
                                ? 'Área do Candidato'
                                : 'Meu Perfil'
                          }
                        </button>
                        
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 max-[1px]:text-red-400 hover:bg-red-50 max-[1px]:hover:bg-red-900/20 transition-colors flex items-center space-x-2"
                        >
                          <LogOut size={14} />
                          <span>Sair</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Link to="/login">
                      <button className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 max-[1px]:text-gray-300 hover:bg-white/90 max-[1px]:hover:bg-gray-700/90 transition-all">
                        Login
                      </button>
                    </Link>
                    
                    <Link to="/register">
                      <button className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all">
                        Cadastro
                      </button>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 rounded-full hover:bg-gray-200/50 max-[1px]:hover:bg-gray-700/50 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label="Abrir menu mobile"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden pb-4 px-4 space-y-2">
              {navItems.map((item) => (
                <MobileNavLink key={item.label} to={item.to} onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </MobileNavLink>
              ))}
              
              <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-gray-200 max-[1px]:border-gray-700">
                {isAuthenticated && user ? (
                  <>
                    <div className="px-4 py-2 bg-gray-50 max-[1px]:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 max-[1px]:text-gray-100">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-500 max-[1px]:text-gray-400">
                        {user.email}
                      </p>
                      <p className="text-xs text-blue-600 max-[1px]:text-blue-400 capitalize">
                        {user.role}
                      </p>
                    </div>
                    
                    <button
                      onClick={navigateToDashboard}
                      className="w-full py-2 px-4 rounded-full text-gray-700 max-[1px]:text-gray-300 hover:bg-white/90 max-[1px]:hover:bg-gray-700/90 transition-all font-medium text-left"
                    >
                      {user.role === 'admin' 
                        ? 'Painel Admin' 
                        : enrollment 
                          ? 'Meu Painel' 
                          : candidate 
                            ? 'Área do Candidato'
                            : 'Meu Perfil'
                      }
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full py-2 px-4 rounded-full text-red-600 max-[1px]:text-red-400 hover:bg-red-50 max-[1px]:hover:bg-red-900/20 transition-all font-medium text-left flex items-center space-x-2"
                    >
                      <LogOut size={16} />
                      <span>Sair</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login">
                      <button className="w-full py-2 rounded-full text-gray-700 max-[1px]:text-gray-300 hover:bg-white/90 max-[1px]:hover:bg-gray-700/90 transition-all font-medium">
                        Login
                      </button>
                    </Link>
                    
                    <Link to="/register">
                      <button className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white py-2 rounded-full font-bold shadow-lg">
                        Cadastro
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}