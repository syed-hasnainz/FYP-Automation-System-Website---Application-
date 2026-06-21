import React from 'react';
import { AdminNavigator } from './AdminNavigator';

/** Committee head uses the same portal screens and APIs as super admin. */
export function CommitteeHeadNavigator() {
  return (
    <AdminNavigator
      portalSubtitle="Committee Head"
      accentColor="#16a34a"
    />
  );
}
