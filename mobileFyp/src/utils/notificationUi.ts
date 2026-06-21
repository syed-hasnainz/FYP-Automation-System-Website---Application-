export function getNotificationIconName(type?: string): string {
  const typeUpper = (type ?? '').toUpperCase();
  if (typeUpper.includes('GROUP')) {
    return 'users';
  }
  if (typeUpper.includes('SUPERVISION')) {
    return 'user-plus';
  }
  if (typeUpper.includes('MESSAGE')) {
    return 'message-circle';
  }
  if (typeUpper.includes('MEETING')) {
    return 'calendar';
  }
  if (typeUpper.includes('PROJECT')) {
    return 'check-circle';
  }
  if (typeUpper.includes('UPLOAD')) {
    return 'upload';
  }
  if (typeUpper.includes('PROFILE')) {
    return 'settings';
  }
  return 'bell';
}

export function getNotificationColors(type?: string) {
  const typeUpper = (type ?? '').toUpperCase();
  if (typeUpper.includes('GROUP') && typeUpper.includes('ACCEPT')) {
    return { bg: '#dcfce7', fg: '#16a34a' };
  }
  if (typeUpper.includes('GROUP') && typeUpper.includes('REJECT')) {
    return { bg: '#fee2e2', fg: '#dc2626' };
  }
  if (typeUpper.includes('GROUP')) {
    return { bg: '#dbeafe', fg: '#2563eb' };
  }
  if (typeUpper.includes('SUPERVISION')) {
    return { bg: '#f3e8ff', fg: '#9333ea' };
  }
  if (typeUpper.includes('MESSAGE')) {
    return { bg: '#fef9c3', fg: '#ca8a04' };
  }
  if (typeUpper.includes('MEETING')) {
    return { bg: '#e0e7ff', fg: '#4f46e5' };
  }
  if (typeUpper.includes('PROJECT')) {
    return { bg: '#fce7f3', fg: '#db2777' };
  }
  if (typeUpper.includes('UPLOAD')) {
    return { bg: '#ffedd5', fg: '#ea580c' };
  }
  return { bg: '#f3f4f6', fg: '#4b5563' };
}

export function formatNotificationTime(dateString?: string) {
  if (!dateString) {
    return '';
  }
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}
