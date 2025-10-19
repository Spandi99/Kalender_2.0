import { useEffect, useMemo, useState } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  aiAvatarUrl?: string | null;
  dicebearSeed?: string;
}

const FALLBACK_PROFILE: UserProfile = {
  id: "local-user",
  name: "Spandi Orgalifer",
  email: "spandi@orgalifer.com",
  avatarUrl: null,
  aiAvatarUrl: null,
  dicebearSeed: "Spandi Orgalifer",
};

const STORAGE_KEY = "orgalifer.profile";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => FALLBACK_PROFILE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      setProfile((previous) => ({
        ...previous,
        ...parsed,
      }));
    } catch (error) {
      console.warn("Unable to read Orgalifer profile from storage", error);
    }
  }, []);

  const saveProfile = (next: Partial<UserProfile>) => {
    setProfile((previous) => {
      const merged: UserProfile = {
        ...previous,
        ...next,
      };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch (error) {
          console.warn("Unable to persist Orgalifer profile", error);
        }
      }
      return merged;
    });
  };

  const memoizedProfile = useMemo(() => profile, [profile]);

  return {
    profile: memoizedProfile,
    isLoading: false,
    updateProfile: saveProfile,
  };
}
