import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import Dashboard from "./Dashboard";

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  };

  return <>{session ? <Dashboard /> : <Login />}</>;
}

export default App;