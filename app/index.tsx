import React from 'react';
import { View } from 'react-native';

import AuthScreen from './screens/auth/auth';
export default function Home() {
  return (
    <View className="flex-1">
      <AuthScreen />
    </View>
  );
}
