import { useRouter } from 'expo-router';
import { StoreScreen } from '../src/store/StoreScreen';

export default function StoreRoute() {
  const router = useRouter();
  return <StoreScreen onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
