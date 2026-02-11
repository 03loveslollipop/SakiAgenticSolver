// navigationConfig.ts - Navigation configuration for the application
import React from 'react';
import { SidebarItem } from '../components/Sidebar';
import { NavigationItem } from '../components/Navigation';

export interface NavigationConfig {
  sidebarItems: SidebarItem[];
  headerItems: NavigationItem[];
}

// Sidebar navigation items for dashboard
export const dashboardSidebarItems: SidebarItem[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: React.createElement('span', null, '📊'), 
    path: '/dashboard' 
  },
  { 
    id: 'vms', 
    label: 'Virtual Machines', 
    icon: React.createElement('span', null, '💻'), 
    path: '/vms' 
  },
  { 
    id: 'create-vm', 
    label: 'Create VM', 
    icon: React.createElement('span', null, '➕'), 
    path: '/vms/create' 
  },
  { 
    id: 'writeups', 
    label: 'Writeups', 
    icon: React.createElement('span', null, '📝'), 
    path: '/writeups' 
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: React.createElement('span', null, '⚙️'), 
    path: '/settings' 
  },
];

// Header navigation items for landing page
export const landingHeaderItems: NavigationItem[] = [
  { id: 'explore', label: 'Explore', path: '/explore', variant: 'normal' },
  { id: 'login', label: 'Login', path: '/login', variant: 'primary' },
];

// Default navigation configuration
export const defaultNavigationConfig: NavigationConfig = {
  sidebarItems: dashboardSidebarItems,
  headerItems: landingHeaderItems,
};
