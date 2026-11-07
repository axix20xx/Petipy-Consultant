import ConsultantSignInScreen, {
  SessionLoadingScreen,
} from '@/components/ConsultantSignInScreen';
import { useConsultantSession } from '@/providers/consultant-session';
import { Redirect } from 'expo-router';

export default function SignInRoute() {
  const { state, activeCall } = useConsultantSession();
  if (state === 'loading') return <SessionLoadingScreen />;
  if (state === 'connected' || activeCall) {
    return <Redirect href="/(tabs)" />;
  }
  return <ConsultantSignInScreen />;
}
