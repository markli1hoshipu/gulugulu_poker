import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { Calendar, Users, UserCheck, UserPlus, Target, Heart, LayoutDashboard, User, LogOut, Settings, ChevronDown, Bot } from 'lucide-react';

import { useUserRole } from '../hooks/useUserRole';
import { useAuth } from '../auth/hooks/useAuth';
import logoImage from '../data/prelude logo transparent.png';

const SidebarMenu = React.memo(({
    currentView,
    setCurrentView,
    onTabClick,
    isChatVisible,
    onToggleChatVisibility,
    isWsConnected,
    loadingEnabled,
    onToggleLoading
}) => {
    const { hasPermission, isLoading } = useUserRole();
    const { user, logout, isAuthenticated } = useAuth();
    const { userRole } = useUserRole();
    const navigate = useNavigate();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        logout();
        setUserMenuOpen(false);
    };

    const handleSettingsClick = () => {
        navigate('/settings');
        setUserMenuOpen(false);
    };

    const handleProfilesClick = () => {
        navigate('/profiles');
        setUserMenuOpen(false);
    };


    const viewConfigs = {
        dashboard: {
            label: 'Dashboard',
            color: 'blue',
            gradient: 'from-blue-600 via-blue-700 to-blue-800',
            shadow: 'shadow-blue-600/40',
            hoverShadow: 'hover:shadow-blue-700/60',
            hoverBg: 'hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-200',
            description: 'Overview of metrics, tasks & AI agents'
        },
        leads: {
            label: 'Lead Generation',
            color: 'blue',
            gradient: 'from-blue-500 to-cyan-500',
            shadow: 'shadow-blue-500/25',
            hoverShadow: 'hover:shadow-blue-500/40',
            description: 'Manage and generate new leads'
        },
        'sales-center': { 
            label: 'Sales Center', 
            color: 'purple',
            gradient: 'from-purple-500 to-pink-500',
            shadow: 'shadow-purple-500/25',
            hoverShadow: 'hover:shadow-purple-500/40',
            description: 'Sales training, CRM & analytics hub'
        },
        crm: { 
            label: 'Customer Relations', 
            color: 'pink',
            gradient: 'from-pink-500 to-rose-500',
            shadow: 'shadow-pink-500/25',
            hoverShadow: 'hover:shadow-pink-500/40',
            description: 'Customer relationship management'
        },
        employees: { 
            label: 'Team Management', 
            color: 'green',
            gradient: 'from-green-500 to-emerald-500',
            shadow: 'shadow-green-500/25',
            hoverShadow: 'hover:shadow-green-500/40',
            description: 'Employee profiles & assignment'
        },
        calendar: { 
            label: 'Calendar & Scheduling', 
            color: 'orange',
            gradient: 'from-orange-500 to-red-500',
            shadow: 'shadow-orange-500/25',
            hoverShadow: 'hover:shadow-orange-500/40',
            description: 'Calendar integration & scheduling'
        },
        'user-onboarding': {
            label: 'User Onboarding',
            color: 'teal',
            gradient: 'from-teal-500 to-cyan-500',
            shadow: 'shadow-teal-500/25',
            hoverShadow: 'hover:shadow-teal-500/40',
            description: 'Manage team organization and personal onboarding'
        },
        'usage-analytics': {
            label: 'Usage Analytics',
            color: 'indigo',
            gradient: 'from-indigo-500 to-violet-500',
            shadow: 'shadow-indigo-500/25',
            hoverShadow: 'hover:shadow-indigo-500/40',
            description: 'Track and analyze platform usage'
        }
    };

    const navigationItems = [
        {
            group: 'Overview',
            items: [
                {
                    id: 'dashboard',
                    icon: LayoutDashboard,
                    config: viewConfigs.dashboard
                }
            ]
        },
        {
            group: '',
            items: [
                {
                    id: 'leads',
                    icon: Users,
                    config: viewConfigs.leads
                },
                {
                    id: 'crm',
                    icon: Heart,
                    config: viewConfigs.crm
                },
                {
                    id: 'sales-center',
                    icon: Target,
                    config: viewConfigs['sales-center']
                }
            ]
        },
        {
            group: 'Team & Calendar',
            items: [
                {
                    id: 'employees',
                    icon: UserCheck,
                    config: viewConfigs.employees
                },
                {
                    id: 'calendar',
                    icon: Calendar,
                    config: viewConfigs.calendar
                },
                {
                    id: 'user-onboarding',
                    icon: UserPlus,
                    config: viewConfigs['user-onboarding']
                },
                {
                    id: 'usage-analytics',
                    icon: Target,
                    config: viewConfigs['usage-analytics']
                }
            ]
        }
    ];

    const NavigationItem = ({ item }) => {
        const { id, icon: Icon, config } = item;
        const isActive = currentView === id;

        // During loading, hide all items for cleaner appearance
        // After loading is complete, check permissions
        if (isLoading || !hasPermission(id)) {
            return null;
        }

        return (
            <motion.div
                key={id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                    duration: 0.3,
                    delay: navigationItems.flatMap(g => g.items).findIndex(i => i.id === id) * 0.1,
                    ease: "easeOut"
                }}
                whileHover={{
                    scale: 1.02,
                    transition: { duration: 0.2 }
                }}
                whileTap={{
                    scale: 0.98,
                    transition: { duration: 0.1 }
                }}
            >
                <div
                    onClick={() => {
                        setCurrentView(id); // Switch tab immediately in sidebar
                        onTabClick?.(id); // Trigger loading for the content
                    }}
                    data-view={id}
                    className={`
                        group cursor-pointer rounded-lg p-3 transition-all duration-300
                        ${isActive ?
                            `bg-gradient-to-r ${config.gradient} text-white ${config.shadow} shadow-xl transform scale-105` :
                            config.hoverBg || 'hover:bg-blue-200'
                        }
                        ${config.hoverShadow} hover:shadow-lg
                    `}
                    style={isActive ? {} : {backgroundColor: 'rgb(217, 239, 243)'}}
                >
                    <div className="relative z-10 flex items-center w-full">
                        <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white drop-shadow-sm' : 'text-gray-600'}`} />
                        <div className="ml-3 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <div className={`font-semibold text-xs leading-tight ${isActive ? 'text-white drop-shadow-sm' : 'text-gray-900'}`}>
                                        {config.label}
                                    </div>
                                    <div className={`text-xs leading-tight mt-0.5 ${isActive ? 'text-white/95 drop-shadow-sm' : 'text-gray-600'}`}>
                                        {config.description}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="sidebar-menu h-full flex flex-col overflow-hidden relative z-20">
            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Header with Logo */}
                <div className="mb-6 flex items-center space-x-3">
                    <img
                        src={logoImage}
                        alt="Prelude Logo"
                        className="h-6 w-auto object-contain"
                    />
                    <h2 className="text-lg font-bold text-gray-900">Navigation</h2>
                </div>
                
                {/* Loading indicator - shows when permissions are being loaded */}
                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-pulse text-gray-400">
                            <div className="space-y-3">
                                <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                                <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                                <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                            </div>
                        </div>
                    </div>
                )}
                
                {!isLoading && navigationItems
                    .map((group) => ({
                        ...group,
                        // Filter items by permissions
                        items: group.items.filter(item => hasPermission(item.id))
                    }))
                    .filter(group => group.items.length > 0)
                    .map((group) => (
                        <div key={group.group}>
                            <h3 className="text-xs font-semibold text-gray-800 mb-3 uppercase tracking-wider">
                                {group.group}
                            </h3>
                            <div className="space-y-2">
                                {group.items.map((item) => (
                                    <NavigationItem 
                                        key={item.id} 
                                        item={item}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                }
            </div>

            {/* Bottom Section - AI Assistant and User Profile */}
            <div className="border-t border-gray-200 p-4 space-y-3 bg-white/50">
                {/* AI Assistant Status */}
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                    <Bot className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-900">AI Assistant</span>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600">Online & Ready</span>
                        </div>
                    </div>
                </div>

                {/* User Profile */}
                {isAuthenticated && (
                    <div className="relative" ref={userMenuRef}>
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                    {user?.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium text-gray-900">
                                        {user?.email?.split('@')[0] || 'User'}
                                    </span>
                                    <span className="text-xs text-gray-500 capitalize">{userRole || 'User'}</span>
                                </div>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* User Dropdown Menu */}
                        <AnimatePresence>
                            {userMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
                                >
                                    <button
                                        onClick={handleProfilesClick}
                                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <User className="h-4 w-4 mr-3 text-gray-600" />
                                        <span className="text-sm text-gray-700">Profile</span>
                                    </button>
                                    <button
                                        onClick={handleSettingsClick}
                                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <Settings className="h-4 w-4 mr-3 text-gray-600" />
                                        <span className="text-sm text-gray-700">Settings</span>
                                    </button>
                                    <div className="border-t border-gray-200"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center px-4 py-3 hover:bg-red-50 transition-colors text-left"
                                    >
                                        <LogOut className="h-4 w-4 mr-3 text-red-600" />
                                        <span className="text-sm text-red-600">Logout</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
});

SidebarMenu.displayName = 'SidebarMenu';

export default SidebarMenu;