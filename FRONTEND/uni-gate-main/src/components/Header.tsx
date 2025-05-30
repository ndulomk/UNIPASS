'use client';
import React, { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X } from 'react-feather';
import { useTheme } from 'next-themes';
import Link from 'next/link';

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-700/90 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
  >
    {children}
  </a>
);

const MobileNavLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) => (
  <a
    href={href}
    onClick={onClick}
    className="block px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
  >
    {children}
  </a>
);

const navItems = [
  { label: 'Início', href: '#' },
  { label: 'Funcionalidades', href: '#' },
  { label: 'Sobre Nós', href: '#' },
  { label: 'Contato', href: '#' },
];

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setHasToken(!!token);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="fixed top-4 left-0 right-0 z-50 mx-auto max-w-[calc(100%-32px)] md:max-w-6xl">
      <div className={`bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-white/20 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300 ${mobileMenuOpen ? 'rounded-2xl' : 'rounded-full'}`}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-inner">
                <span className="text-white font-bold text-lg">UG</span>
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                UniPass
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              {navItems.map((item) => (
                <NavLink key={item.label} href={item.href}>{item.label}</NavLink>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Alternar modo escuro"
              >
                {theme === 'dark' ? <Sun size={18} className="text-yellow-300" /> : <Moon size={18} className="text-neutral-700" />}
              </button>

              {/* Desktop Auth Buttons */}
              <div className="hidden md:flex items-center space-x-2">
                <Link href="/login">
                  <button className="px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all">
                    Login
                  </button>
                </Link>
                
                <Link href="/register">
                  <button className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all">
                    Cadastro
                  </button>
                </Link>

                {hasToken && (
                  <Link href="/admin">
                    <button className="bg-gradient-to-br from-green-600 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all">
                      Admin
                    </button>
                  </Link>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                <MobileNavLink key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </MobileNavLink>
              ))}
              
              <div className="flex flex-col space-y-2 mt-4">
                {!hasToken && <> <Link href="/login">
                  <button className="w-full py-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all font-medium">
                    Login
                  </button>
                </Link>
                
                <Link href="/register">
                  <button className="w-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white py-2 rounded-full font-bold shadow-lg">
                    Cadastro
                  </button>
                </Link></>}

                {hasToken && (
                  <Link href="/admin">
                    <button className="w-full bg-gradient-to-br from-green-600 to-teal-600 text-white py-2 rounded-full font-bold shadow-lg">
                      Admin
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}