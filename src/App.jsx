import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import { T } from "./theme.js";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div
        className="ed-sans"
        style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", color: T.slate, fontSize: 13 }}
      >
        Cargando…
      </div>
    );
  }

  return session ? <Dashboard session={session} /> : <Login />;
}
