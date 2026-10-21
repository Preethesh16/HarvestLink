import { useEffect, useState } from "react";
import App from "./App";
import Welcome from "./Welcome";
import { LanguagePicker, LocaleProvider, useLocale } from "./Locale";
import "./portal.css";
function Portal() {
  const { tr } = useLocale();
  const [actor, setActor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.actor && d.onboarded) setActor(d.actor);
      })
      .catch(() => setActor(null))
      .finally(() => setLoading(false));
  }, []);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setActor(null);
  }
  return (
    <>
      <div className={`portal-tools ${actor ? "signed-in" : ""}`}>
        <LanguagePicker />
        {actor && <button onClick={logout}>{tr("Sign out")}</button>}
      </div>
      {loading ? (
        <div className="portal-loading">{tr("Opening HarvestLink…")}</div>
      ) : actor ? (
        <App key={actor} initialActor={actor} />
      ) : (
        <Welcome onLogin={setActor} t={tr} />
      )}
    </>
  );
}
export default function Root() {
  return (
    <LocaleProvider>
      <Portal />
    </LocaleProvider>
  );
}
