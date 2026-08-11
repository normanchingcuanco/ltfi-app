import { Slot } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import api from '../src/utils/api';
import { activateKeepAwakeAsync } from 'expo-keep-awake';

function WarmUpBackend() {
  useEffect(() => {
    activateKeepAwakeAsync();
    const ping = async () => {
      try {
        await api.get('/health');
      } catch {
        setTimeout(() => api.get('/health').catch(() => {}), 3000);
      }
    };
    ping();
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WarmUpBackend />
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </SafeAreaProvider>
  );
}