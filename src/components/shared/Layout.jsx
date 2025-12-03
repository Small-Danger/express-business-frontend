import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import useNotifications from '../../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });
  
  // État pour les menus accordéon (expand/collapse)
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const saved = localStorage.getItem('expandedMenus');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const notificationButtonRef = useRef(null);
  
  const { user, logout, hasAnyRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Sauvegarder l'état de la sidebar dans localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen.toString());
  }, [sidebarOpen]);

  // Sauvegarder l'état des menus expansés dans localStorage
  useEffect(() => {
    localStorage.setItem('expandedMenus', JSON.stringify(expandedMenus));
  }, [expandedMenus]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  // Vérifier si un enfant est actif
  const hasActiveChild = (children) => {
    if (!children) return false;
    return children.some(child => isActive(child.path));
  };

  // Toggle expand/collapse d'un menu
  const toggleMenu = (menuPath) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuPath]: !prev[menuPath],
    }));
  };

  // Détecter le module actif pour les logos et couleurs
  const getActiveModule = () => {
    if (location.pathname.startsWith('/business')) return 'business';
    if (location.pathname.startsWith('/express')) return 'express';
    return 'default';
  };

  const activeModule = getActiveModule();
  
  // Configuration des modules
  const moduleConfig = {
    business: {
      logo: '/assets/logos/logo_business.png',
      color: 'orange',
      barColor: 'bg-orange-600',
      textColor: 'text-orange-600',
    },
    express: {
      logo: '/assets/logos/logo_express.jpg',
      color: 'green',
      barColor: 'bg-green-600',
      textColor: 'text-green-600',
    },
    default: {
      logo: '/assets/logos/logo_entreprise.png',
      color: 'blue',
      barColor: 'bg-blue-600',
      textColor: 'text-blue-600',
    },
  };

  const currentModule = moduleConfig[activeModule] || moduleConfig.default;

  const menuItems = [
    // Dashboard
    {
      name: 'Tableau de bord',
      path: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      roles: ['admin', 'boss', 'secretary', 'traveler'],
    },
    
    // Module Business
    {
      name: 'Business',
      path: '/business',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      roles: ['admin', 'boss', 'secretary'],
      children: [
        { name: 'Clients', path: '/business/clients' },
        { name: 'Produits', path: '/business/products' },
        { name: 'Convois', path: '/business/waves' },
      ],
    },
    
    // Module Express
    {
      name: 'Express',
      path: '/express',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      roles: ['admin', 'boss', 'secretary', 'traveler'],
      children: [
        { name: 'Convois', path: '/express/waves' },
      ],
    },
    
    // Trésorerie (Admin et Boss uniquement)
    {
      name: 'Trésorerie',
      path: '/treasury',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      roles: ['admin', 'boss'],
      children: [
        { name: 'Trésorerie', path: '/treasury/accounts' },
      ],
    },
    
    // Administration (Admin uniquement)
    {
      name: 'Administration',
      path: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      roles: ['admin'],
      children: [
        { name: 'Utilisateurs', path: '/admin/users' },
        { name: 'Paramètres', path: '/admin/settings' },
      ],
    },
  ];

  // Filtrer les éléments de menu selon le rôle
  const filteredMenuItems = menuItems.filter(item => 
    hasAnyRole(item.roles)
  );

  // Auto-expand les menus si un enfant est actif au chargement ou changement de route
  useEffect(() => {
    const newExpandedMenus = { ...expandedMenus };
    let hasChanges = false;

    filteredMenuItems.forEach(item => {
      if (item.children && hasActiveChild(item.children)) {
        // Si le menu n'a pas encore d'état défini ou est fermé, on l'expand automatiquement
        if (newExpandedMenus[item.path] === undefined || newExpandedMenus[item.path] === false) {
          newExpandedMenus[item.path] = true;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setExpandedMenus(newExpandedMenus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Se déclenche quand la route change

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 dark:bg-gray-950 text-white transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 dark:border-gray-700">
          {sidebarOpen ? (
            <div className="flex items-center space-x-2">
              <img 
                src="/assets/logos/logo_entreprise.png" 
                alt="Logo EXPRESS & BUSINESS"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <h1 className="text-xl font-bold">EXPRESS & BUSINESS</h1>
            </div>
          ) : (
            <img 
              src="/assets/logos/logo_entreprise.png" 
              alt="Logo"
              className="h-8 w-auto mx-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {filteredMenuItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus[item.path] !== undefined 
                ? expandedMenus[item.path] 
                : hasActiveChild(item.children); // Expand par défaut si un enfant est actif
              const isParentActive = hasActiveChild(item.children);
              const activeModule = getActiveModule();
              
              return (
                <li key={item.path}>
                  {hasChildren ? (
                    // Menu avec sous-menu (accordéon)
                    <div>
                      <button
                        onClick={() => toggleMenu(item.path)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          isParentActive
                            ? activeModule === 'business'
                              ? 'bg-orange-600/20 dark:bg-orange-700/20 border-l-2 border-orange-500'
                              : activeModule === 'express'
                              ? 'bg-green-600/20 dark:bg-green-700/20 border-l-2 border-green-500'
                              : 'bg-blue-600/20 dark:bg-blue-700/20 border-l-2 border-blue-500'
                            : 'text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {item.icon}
                          {sidebarOpen && (
                            <span className={`font-medium ${isParentActive ? 'text-white' : ''}`}>
                              {item.name}
                            </span>
                          )}
                        </div>
                        {sidebarOpen && (
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'transform rotate-90' : ''
                            } ${isParentActive ? 'text-white' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                      {sidebarOpen && isExpanded && (
                        <ul className="ml-8 mt-2 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.path}>
                              <Link
                                to={child.path}
                                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isActive(child.path)
                                    ? activeModule === 'business'
                                      ? 'bg-orange-600 dark:bg-orange-700 text-white'
                                      : activeModule === 'express'
                                      ? 'bg-green-600 dark:bg-green-700 text-white'
                                      : 'bg-blue-600 dark:bg-blue-700 text-white'
                                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white'
                                }`}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    // Menu simple
                    <Link
                      to={item.path}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? activeModule === 'business'
                            ? 'bg-orange-600 dark:bg-orange-700 text-white'
                            : activeModule === 'express'
                            ? 'bg-green-600 dark:bg-green-700 text-white'
                            : 'bg-blue-600 dark:bg-blue-700 text-white'
                          : 'text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-700'
                      }`}
                    >
                      {item.icon}
                      {sidebarOpen && <span className="font-medium">{item.name}</span>}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-800 dark:border-gray-700 p-4">
          {sidebarOpen && (
            <div className="mb-4">
              <div className="text-sm text-gray-400">Connecté en tant que</div>
              <div className="font-medium text-white">{user?.name}</div>
              <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-5 gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Logo du module */}
              <img 
                src={currentModule.logo} 
                alt={`Logo ${activeModule}`}
                className="h-8 sm:h-10 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {/* Barre de couleur selon le module */}
              <div className={`h-8 sm:h-10 w-1 rounded-full ${currentModule.barColor} dark:opacity-80`}></div>
              <h2 className={`text-xl sm:text-2xl font-bold capitalize tracking-tight ${currentModule.textColor} dark:text-gray-100`}>
                {location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              {/* Bouton Toggle Dark Mode */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (toggleTheme && typeof toggleTheme === 'function') {
                    toggleTheme();
                  } else {
                    console.error('toggleTheme is not available or not a function');
                  }
                }}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 cursor-pointer"
                title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                type="button"
                aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                {isDark ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  ref={notificationButtonRef}
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 cursor-pointer"
                  title="Notifications"
                  type="button"
                  aria-label="Notifications"
                >
                  <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationDropdownOpen && (
                  <NotificationDropdown
                    notifications={notifications}
                    onClose={() => setNotificationDropdownOpen(false)}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                  />
                )}
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

