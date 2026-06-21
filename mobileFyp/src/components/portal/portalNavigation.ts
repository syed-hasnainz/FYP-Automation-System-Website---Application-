import { createContext, useContext } from 'react';

export type PortalNavigateOptions = {
  settingsTab?: 'general' | 'security' | 'notifications' | 'backup' | 'policies';
};

type PortalNavigationContextValue = {
  openDrawer: () => void;
  navigateTo: (route: string, options?: PortalNavigateOptions) => void;
  routeOptions: PortalNavigateOptions | null;
  clearRouteOptions: () => void;
};

export const PortalNavigationContext = createContext<PortalNavigationContextValue>({
  openDrawer: () => {},
  navigateTo: () => {},
  routeOptions: null,
  clearRouteOptions: () => {},
});

export function usePortalNavigation() {
  return useContext(PortalNavigationContext);
}
