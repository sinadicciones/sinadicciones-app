import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function PurposeIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/purpose/dashboard');
  }, []);

  return null;
}
