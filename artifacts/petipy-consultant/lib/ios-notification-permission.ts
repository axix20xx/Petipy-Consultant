export type IosNotificationPermission =
  | 'authorized'
  | 'provisional'
  | 'denied'
  | 'not-determined'
  | 'unavailable';

type PermissionSnapshot = {
  granted: boolean;
  status: string;
  iosStatus?: number;
};

export function normalizeIosNotificationPermission(
  permission: PermissionSnapshot,
): IosNotificationPermission {
  if (permission.iosStatus === 3) return 'provisional';
  if (
    permission.granted ||
    permission.iosStatus === 2 ||
    permission.iosStatus === 4
  ) {
    return 'authorized';
  }
  if (permission.iosStatus === 1 || permission.status === 'denied') {
    return 'denied';
  }
  if (
    permission.iosStatus === 0 ||
    permission.status === 'undetermined'
  ) {
    return 'not-determined';
  }
  return 'unavailable';
}
