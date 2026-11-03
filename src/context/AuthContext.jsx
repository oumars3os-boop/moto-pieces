import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Synchronisation automatique et permanente du stockage local avec la session Supabase
    const syncLocalStorage = (currentSession) => {
      try {
        if (currentSession?.user) {
          const currentUser = currentSession.user;
          const role = currentUser.user_metadata?.role || localStorage.getItem("motopieces_role") || "admin";
          const userObj = {
            id: currentUser.id,
            email: currentUser.email || "",
            tel: currentUser.phone || currentUser.user_metadata?.tel || "",
            nom: currentUser.user_metadata?.nom || currentUser.email || "Utilisateur Supabase",
            role: role,
          };
          localStorage.setItem("motopieces_session", JSON.stringify(currentSession));
          localStorage.setItem("motopieces_user", JSON.stringify(userObj));
          localStorage.setItem("motopieces_role", role);
        } else if (!localStorage.getItem("motopieces_user")) {
          localStorage.removeItem("motopieces_session");
          localStorage.removeItem("motopieces_role");
          localStorage.removeItem("motopieces_user");
        }
      } catch (e) {
        console.warn("Erreur de synchronisation stockage local:", e);
      }
    };

    // 1. Écouteur de session Supabase actif en permanence durant tout le cycle de vie de l'application
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      syncLocalStorage(currentSession);
      setLoading(false);
    });

    // 2. Vérification immédiate de la session au démarrage / rechargement du navigateur
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        syncLocalStorage(initialSession);
      }
      setLoading(false);
    }).catch(err => {
      console.warn("Erreur lors de la récupération de la session Supabase:", err);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return data;
  };

  const signOut = async () => {
    try {
      localStorage.removeItem("motopieces_session");
      localStorage.removeItem("motopieces_role");
      localStorage.removeItem("motopieces_user");
    } catch {}
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
