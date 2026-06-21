import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PortalDrawerContent,
  type PortalMenuItem,
} from './PortalDrawerContent';
import {
  PortalNavigationContext,
  type PortalNavigateOptions,
} from './portalNavigation';
import { NotificationProvider } from '../../context/NotificationContext';
import { NotificationsPanel } from './NotificationsPanel';
import type { RootStackParamList } from '../../navigation/types';

type ScreenMap = Record<string, React.ComponentType>;

type Props = {
  menuItems: PortalMenuItem[];
  portalTitle: string;
  portalSubtitle: string;
  accentColor?: string;
  screens: ScreenMap;
  initialRoute: string;
};

export function PortalShell({
  menuItems,
  portalTitle,
  portalSubtitle,
  accentColor,
  screens,
  initialRoute,
}: Props) {
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeScreen, setActiveScreen] = useState(initialRoute);
  const [routeOptions, setRouteOptions] = useState<PortalNavigateOptions | null>(
    null,
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-320)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setIsMenuMounted(true);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  const ScreenComponent = screens[activeScreen] ?? screens[initialRoute];
  const portalNavigation = useMemo(
    () => ({
      openDrawer: openMenu,
      navigateTo: (route: string, options?: PortalNavigateOptions) => {
        if (screens[route]) {
          setRouteOptions(options ?? null);
          setActiveScreen(route);
          closeMenu();
        }
      },
      routeOptions,
      clearRouteOptions: () => setRouteOptions(null),
    }),
    [closeMenu, openMenu, routeOptions, screens],
  );

  useEffect(() => {
    if (!isMenuMounted) {
      return;
    }
    if (menuVisible) {
      Animated.parallel([
        Animated.timing(drawerTranslateX, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(drawerTranslateX, {
          toValue: -320,
          duration: 230,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsMenuMounted(false);
        }
      });
    }
  }, [backdropOpacity, drawerTranslateX, isMenuMounted, menuVisible]);

  return (
    <NotificationProvider>
      <PortalNavigationContext.Provider value={portalNavigation}>
        <View style={styles.container}>
          <ScreenComponent />
          <NotificationsPanel />

          <Modal
          visible={isMenuMounted}
          transparent
          animationType="none"
          onRequestClose={closeMenu}>
          <View style={styles.modalRoot}>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
              <Pressable style={styles.dismissArea} onPress={closeMenu} />
            </Animated.View>
            <Animated.View style={[styles.drawerPanel, { transform: [{ translateX: drawerTranslateX }] }]}>
              <PortalDrawerContent
                menuItems={menuItems}
                portalTitle={portalTitle}
                portalSubtitle={portalSubtitle}
                accentColor={accentColor}
                activeRoute={activeScreen}
                onNavigate={(route) => {
                  setActiveScreen(route);
                  closeMenu();
                }}
                onClose={closeMenu}
                onLogout={() => {
                  closeMenu();
                  rootNavigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                }}
              />
            </Animated.View>
          </View>
          </Modal>
        </View>
      </PortalNavigationContext.Provider>
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dismissArea: {
    position: 'absolute',
    left: 300,
    right: 0,
    top: 0,
    bottom: 0,
  },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 2,
    width: 300,
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
});
