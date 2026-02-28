import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function PurposeIndex() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Use setTimeout to ensure navigation happens after component is fully mounted
      const timer = setTimeout(() => {
        router.replace('/purpose/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
      <ActivityIndicator size="large" color="#8B5CF6" />
    </View>
  );
}
