import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import { handleBackgroundIncomingMessage } from '@/lib/push-notifications';

setBackgroundMessageHandler(getMessaging(), handleBackgroundIncomingMessage);
