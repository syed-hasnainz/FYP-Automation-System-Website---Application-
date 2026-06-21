import { useEffect, useState } from 'react';
import type { AuthUser } from '../types/auth';
import { useAuthStore } from '../store/authStore';

export function useAuthUser() {
  const user = useAuthStore((s) => s.user);
  const hydrateUser = useAuthStore((s) => s.hydrateUser);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        await hydrateUser();
      }
      if (active) {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [hydrateUser, user]);

  return { user: user as AuthUser | null, loading };
}
