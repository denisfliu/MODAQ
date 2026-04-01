import React from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface AuthState {
    session: Session | null;
    user: User | null;
    loading: boolean;
    displayName: string | null;
}

interface AuthContextValue extends AuthState {
    signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
    const [state, setState] = React.useState<AuthState>({
        session: null,
        user: null,
        loading: true,
        displayName: null,
    });

    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setState((prev) => ({ ...prev, session, user: session?.user ?? null, loading: false }));
            if (session?.user) {
                fetchDisplayName(session.user.id);
                acceptPendingInvites(session.user);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setState((prev) => ({ ...prev, session, user: session?.user ?? null, loading: false }));
            if (session?.user) {
                fetchDisplayName(session.user.id);
                acceptPendingInvites(session.user);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchDisplayName = async (userId: string) => {
        const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
        if (data) {
            setState((prev) => ({ ...prev, displayName: data.display_name }));
        }
    };

    const acceptPendingInvites = async (user: User) => {
        // Link any pending moderator invites for this email
        const email = user.email;
        if (!email) return;

        await supabase
            .from("tournament_moderators")
            .update({ user_id: user.id, accepted_at: new Date().toISOString() })
            .eq("email", email)
            .is("user_id", null);
    };

    const signUp = async (
        email: string,
        password: string,
        displayName: string
    ): Promise<{ error: string | null }> => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } },
        });
        return { error: error?.message ?? null };
    };

    const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setState({ session: null, user: null, loading: false, displayName: null });
    };

    return <AuthContext.Provider value={{ ...state, signUp, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
