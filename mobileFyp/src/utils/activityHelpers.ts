export type ActivityStyle = {
  backgroundColor: string;
  dotColor: string;
  badge: string;
  badgeColor: string;
  badgeBackground: string;
};

export function formatActivityTime(dateString?: string) {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
  return date.toLocaleDateString();
}

export function getActivityStyle(type?: string): ActivityStyle {
  const typeUpper = (type ?? '').toUpperCase();

  if (
    typeUpper.includes('ACCEPTED') ||
    typeUpper.includes('APPROVED') ||
    typeUpper.includes('SUCCESS')
  ) {
    return {
      backgroundColor: '#f0fdf4',
      dotColor: '#22c55e',
      badge: 'Success',
      badgeColor: '#166534',
      badgeBackground: '#dcfce7',
    };
  }
  if (
    typeUpper.includes('REJECTED') ||
    typeUpper.includes('DECLINED') ||
    typeUpper.includes('ERROR')
  ) {
    return {
      backgroundColor: '#fef2f2',
      dotColor: '#ef4444',
      badge: 'Declined',
      badgeColor: '#991b1b',
      badgeBackground: '#fee2e2',
    };
  }
  if (
    typeUpper.includes('PENDING') ||
    typeUpper.includes('WAITING') ||
    typeUpper.includes('MEETING')
  ) {
    return {
      backgroundColor: '#fefce8',
      dotColor: '#eab308',
      badge: 'Pending',
      badgeColor: '#854d0e',
      badgeBackground: '#fef9c3',
    };
  }
  if (typeUpper.includes('MESSAGE')) {
    return {
      backgroundColor: '#eff6ff',
      dotColor: '#3b82f6',
      badge: 'Message',
      badgeColor: '#1e40af',
      badgeBackground: '#dbeafe',
    };
  }
  if (typeUpper.includes('GROUP')) {
    return {
      backgroundColor: '#faf5ff',
      dotColor: '#a855f7',
      badge: 'Group',
      badgeColor: '#6b21a8',
      badgeBackground: '#f3e8ff',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    dotColor: '#3b82f6',
    badge: 'New',
    badgeColor: '#1e40af',
    badgeBackground: '#dbeafe',
  };
}
