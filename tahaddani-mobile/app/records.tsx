import { useRouter } from 'expo-router';
import { RecordsScreen } from '../src/store/RecordsScreen';

export default function RecordsRoute() {
  const router = useRouter();
  return <RecordsScreen onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
