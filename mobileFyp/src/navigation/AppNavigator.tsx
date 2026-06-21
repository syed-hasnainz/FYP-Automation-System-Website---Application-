import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/auth/HomeScreen';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { AdminNavigator } from './AdminNavigator';
import { CommitteeHeadNavigator } from './CommitteeHeadNavigator';
import { StudentNavigator } from './StudentNavigator';
import { TeacherNavigator } from './TeacherNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SuperAdmin" component={AdminNavigator} />
      <Stack.Screen name="CommitteeHead" component={CommitteeHeadNavigator} />
      <Stack.Screen name="Teacher" component={TeacherNavigator} />
      <Stack.Screen name="Student" component={StudentNavigator} />
    </Stack.Navigator>
  );
}
