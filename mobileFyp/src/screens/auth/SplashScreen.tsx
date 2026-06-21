import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { getStoredUser } from '../../utils/storage';
import { useAuthStore } from '../../store/authStore';
import type { AuthUser } from '../../types/auth';

const buildingBg = require('../../assets/building.png');
const hamdardLogo = require('../../assets/hamdard-logo.png');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      const storedUser = await getStoredUser<AuthUser>();
      if (storedUser) {
        useAuthStore.getState().setUser(storedUser);
        switch (storedUser.role) {
          case 'ADMIN':
            navigation.replace('SuperAdmin');
            return;
          case 'COMMITTEE_HEAD':
            navigation.replace('CommitteeHead');
            return;
          case 'TEACHER':
            navigation.replace('Teacher');
            return;
          case 'STUDENT':
          default:
            navigation.replace('Student');
            return;
        }
      }
      navigation.replace('Home');
    }, 1800);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={buildingBg}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover">
        <View style={styles.overlay} />

        <View style={styles.content}>
          <Image source={hamdardLogo} style={styles.logo} resizeMode="contain" />

          <Text style={styles.title}>UNIVERSITY</Text>
          <Text style={styles.subtitle}>FYP Automation System</Text>

          <Text style={styles.tagline}>
            Manage your Final Year Project journey in one place
          </Text>

          <ActivityIndicator
            size="small"
            color="#16a34a"
            style={styles.loader}
          />

          <Pressable
            style={styles.button}
            onPress={() => navigation.replace('Home')}>
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecfdf5',
  },
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  backgroundImage: {
    opacity: 0.25,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 1,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 22,
    maxWidth: 280,
  },
  loader: {
    marginTop: 28,
  },
  button: {
    marginTop: 24,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
