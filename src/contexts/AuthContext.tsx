import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, role: AppRole, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile | null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (cancelled) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(async () => {
            const profileData = await fetchProfile(currentSession.user.id);
            setProfile(profileData);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Then get initial session (and validate it). If a stale refresh token exists,
    // the SDK can appear "logged in" while requests become unauthenticated,
    // causing row-level policy errors.
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) {
        console.warn('Auth session recovery failed; clearing local session.', error);
        // Clear local auth state even if server-side sign-out fails.
        await supabase.auth.signOut({ scope: 'local' });
        if (cancelled) return;
        clearAuthState();
        setLoading(false);
        return;
      }

      const initialSession = data.session;
      if (!initialSession?.user) {
        setLoading(false);
        return;
      }

      // Validate the session with the backend. If invalid, force local sign-out.
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userError || !userData?.user) {
        console.warn('Auth user validation failed; clearing local session.', userError);
        await supabase.auth.signOut({ scope: 'local' });
        if (cancelled) return;
        clearAuthState();
        setLoading(false);
        return;
      }

      setSession(initialSession);
      setUser(initialSession.user);

      const profileData = await fetchProfile(initialSession.user.id);
      if (cancelled) return;
      setProfile(profileData);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, role: AppRole, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          role,
          full_name: fullName || null,
        },
      },
    });

    if (error) {
      return { error };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    clearAuthState();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
