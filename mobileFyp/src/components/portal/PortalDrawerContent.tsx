import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store/authStore';
import { getProfileImageUri } from '../../services/profileService';
import type { AuthUser } from '../../types/auth';

const hamdardLogo = require('../../assets/hamdard-logo.png');

export type PortalMenuItem = {
  name: string;
  label: string;
  description?: string;
  icon: string;
};

type Props = {
  menuItems: PortalMenuItem[];
  portalTitle: string;
  portalSubtitle: string;
  accentColor?: string;
  activeRoute: string;
  onNavigate: (route: string) => void;
  onClose: () => void;
  onLogout: () => void;
};

function MenuIcon({
  name,
  size,
  color,
}: {
  name: string;
  size: number;
  color: string;
}) {
  if (name === 'building-2') {
    return (
      <MaterialCommunityIcon name="office-building-outline" size={size + 2} color={color} />
    );
  }
  return <FeatherIcon name={name} size={size} color={color} />;
}

export function PortalDrawerContent({
  menuItems,
  portalTitle,
  portalSubtitle,
  accentColor = '#2563eb',
  activeRoute,
  onNavigate,
  onClose,
  onLogout,
}: Props) {
  const user = useAuthStore((s) => s.user) as AuthUser | null;
  const logout = useAuthStore((s) => s.logout);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const drawerAvatarUri = getProfileImageUri(user?.profileImage, user?.id);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.brand}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
          <FeatherIcon name="x" size={18} color="#4b5563" />
        </Pressable>
        <View style={styles.logoWrap}>
          <Image source={hamdardLogo} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.portalTitle}>{portalTitle}</Text>
        <Text style={styles.portalSubtitle}>{portalSubtitle}</Text>
      </View>

      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => {
          const isActive = activeRoute === item.name;
          return (
            <Pressable
              key={item.name}
              style={[
                styles.menuItem,
                isActive && {
                  backgroundColor: `${accentColor}12`,
                  borderLeftColor: accentColor,
                },
              ]}
              onPress={() => onNavigate(item.name)}>
              <View
                style={[
                  styles.menuIconWrap,
                  isActive && { backgroundColor: `${accentColor}18` },
                ]}>
                <MenuIcon
                  name={item.icon}
                  size={18}
                  color={isActive ? accentColor : '#64748b'}
                />
              </View>
              <View style={styles.menuTextWrap}>
                <Text
                  style={[
                    styles.menuLabel,
                    isActive && { color: accentColor, fontWeight: '700' },
                  ]}>
                  {item.label}
                </Text>
                {item.description ? (
                  <Text
                    style={[
                      styles.menuDescription,
                      isActive && { color: `${accentColor}cc` },
                    ]}
                    numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.userRow}>
          <View style={[styles.avatar, { backgroundColor: `${accentColor}18` }]}>
            {drawerAvatarUri ? (
              <Image source={{ uri: drawerAvatarUri }} style={styles.avatarImage} />
            ) : (
              <FeatherIcon name="user" size={18} color={accentColor} />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name ?? 'User'}
            </Text>
            <Text style={styles.userRole} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>
        </View>
        <Pressable
          style={[styles.logoutBtn, isLoggingOut && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}>
          {isLoggingOut ? (
            <ActivityIndicator color="#dc2626" size="small" />
          ) : (
            <FeatherIcon name="log-out" size={16} color="#dc2626" />
          )}
          <Text style={styles.logoutText}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  brand: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logo: {
    width: 56,
    height: 56,
  },
  portalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  portalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  menu: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 11,
    marginVertical: 2,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  menuTextWrap: {
    flex: 1,
    paddingRight: 4,
  },
  menuLabel: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  menuDescription: {
    marginTop: 3,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
    backgroundColor: '#fff',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  userRole: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutBtnDisabled: {
    opacity: 0.85,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
});
