import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Leaf,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sprout,
  Store,
  X,
} from "lucide-react";
import "./welcome.css";
const Farm = lazy(() => import("./Farm"));
type Props = { onLogin: (actor: string) => void; t: (s: string) => string };
export default function Welcome({ onLogin, t }: Props) {
  const [stage, setStage] = useState<"landing" | "login" | "onboard">(
    "landing",
  );
  const [actor, setActor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [intro, setIntro] = useState(true);
  const formTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIntro(false);
      return;
    }
    const timer = window.setTimeout(() => setIntro(false), 2300);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (stage !== "landing") formTitle.current?.focus();
  }, [stage]);
  function openLogin() {
    setIntro(false);
    setError("");
    setStage("login");
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Sign-in failed. Please check your details.",
        );
      setActor(data.actor);
      if (data.onboarded) onLogin(data.actor);
      else setStage("onboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function onboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/auth/onboard", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Your profile could not be saved. Please try again.",
        );
      onLogin(data.actor || actor);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={`welcome ${intro ? "welcome-revealing" : "welcome-revealed"}`}
    >
      <header className="welcome-header">
        <a
          href="#"
          className="welcome-brand"
          onClick={(e) => {
            e.preventDefault();
            if (!busy && stage !== "onboard") setStage("landing");
          }}
          aria-label={t("HarvestLink home")}
        >
          <Sprout size={29} />
          <span>
            harvestlink<span>.</span>
          </span>
        </a>
        <div className="welcome-header-right">
          <span className="welcome-local">
            <span />
            {t("Grown nearby. Connected thoughtfully.")}
          </span>
          {stage === "landing" && (
            <button className="welcome-signin" onClick={openLogin}>
              {t("Sign in")}
              <ArrowUpRight size={16} />
            </button>
          )}
        </div>
      </header>
      {stage === "landing" ? (
        <main className="welcome-landing">
          <div className="welcome-grain" aria-hidden="true" />
          <div className="welcome-orbit orbit-one" aria-hidden="true" />
          <div className="welcome-orbit orbit-two" aria-hidden="true" />
          <div className="welcome-scene" aria-hidden="true">
            <Suspense
              fallback={
                <div className="welcome-scene-placeholder">
                  <Sprout size={70} />
                </div>
              }
            >
              <Farm />
            </Suspense>
          </div>
          <section className="welcome-editorial">
            <div className="welcome-kicker">
              <span />
              {t("A NEW SEASON OF CONNECTION")}
            </div>
            <h1>
              <span>{t("Good things")}</span>
              <br />
              <em>{t("grow together.")}</em>
            </h1>
            <p>
              {t(
                "From the hands that grow it to the kitchens that need it. A more thoughtful way to trade your harvest.",
              )}
            </p>
            <div className="welcome-hero-actions">
              <button className="welcome-enter" onClick={openLogin}>
                {t("Enter your workspace")}
                <ArrowRight size={19} />
              </button>
              <a className="welcome-how" href="#welcome-how">
                {t("See how it works")}
                <ChevronDown size={16} />
              </a>
            </div>
            <div className="welcome-human">
              <ShieldCheck size={16} />
              <span>{t("Your agent negotiates. You make the choice.")}</span>
            </div>
          </section>
          <div className="welcome-scene-label">
            <span />
            <div>
              {t("THE FARM-TO-KITCHEN CONNECTION")}
              <small>
                {t("An illustrative landscape. Real people at the centre.")}
              </small>
            </div>
          </div>
          {intro && (
            <button className="welcome-skip" onClick={() => setIntro(false)}>
              {t("Skip introduction")}
              <ArrowRight size={14} />
            </button>
          )}
          <div className="welcome-bottom">
            <span>
              <Leaf size={15} />
              {t("FARMER-LED. KITCHEN-READY.")}
            </span>
            <span>{t("01 / A better way to grow")}</span>
          </div>
        </main>
      ) : (
        <main className="welcome-access">
          <section className="welcome-access-story">
            <div className="welcome-kicker">
              <span />
              {t("GOOD TO HAVE YOU HERE")}
            </div>
            <h1>
              {t("A little closer")}
              <br />
              <em>{t("to a better harvest.")}</em>
            </h1>
            <p>
              {t(
                "One connected network. A private workspace for every grower and every kitchen.",
              )}
            </p>
            <div className="welcome-access-scene" aria-hidden="true">
              <Suspense fallback={<Sprout size={60} />}>
                <Farm />
              </Suspense>
            </div>
            <div className="welcome-access-assurance">
              <ShieldCheck size={21} />
              <span>{t("Private limits. Clear offers. Human decisions.")}</span>
            </div>
          </section>
          <section className="welcome-form-panel">
            <div className="welcome-form-wrap">
              <div className="welcome-form-step">
                <span className={stage === "login" ? "current" : "complete"}>
                  {stage === "login" ? "1" : <Check size={14} />}
                </span>
                <span>{t("Sign in")}</span>
                <i />
                <span className={stage === "onboard" ? "current" : ""}>2</span>
                <span>{t("Your workspace")}</span>
              </div>
              <div className="welcome-form-icon">
                {stage === "onboard" ? (
                  actor === "farmer" ? (
                    <Sprout size={26} />
                  ) : (
                    <Store size={26} />
                  )
                ) : (
                  <LockKeyhole size={25} />
                )}
              </div>
              <h2 ref={formTitle} tabIndex={-1}>
                {t(
                  stage === "login"
                    ? "Welcome to your next chapter."
                    : "Make yourself at home.",
                )}
              </h2>
              <p className="welcome-form-intro">
                {t(
                  stage === "login"
                    ? "Sign in to your own farm or restaurant workspace."
                    : "Two details to help your trading partners know you.",
                )}
              </p>
              {error && (
                <div className="welcome-error" role="alert">
                  {t(error)}
                  <button
                    aria-label={t("Dismiss error")}
                    onClick={() => setError("")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              {stage === "login" ? (
                <form onSubmit={login}>
                  <label className="welcome-field">
                    {t("Username")}
                    <input
                      name="username"
                      autoComplete="username"
                      placeholder={t("Your account username")}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={busy}
                    />
                  </label>
                  <label className="welcome-field">
                    {t("Password")}
                    <span className="welcome-password">
                      <input
                        name="password"
                        type={visiblePassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={t("Your password")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={busy}
                      />
                      <button
                        type="button"
                        aria-label={t(
                          visiblePassword ? "Hide password" : "Show password",
                        )}
                        onClick={() => setVisiblePassword(!visiblePassword)}
                      >
                        {visiblePassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </span>
                  </label>
                  <button className="welcome-submit" disabled={busy}>
                    {t(busy ? "Signing you in…" : "Sign in to workspace")}
                    <ArrowRight size={18} />
                  </button>
                </form>
              ) : (
                <form onSubmit={onboard}>
                  <label className="welcome-field">
                    {t(
                      actor === "farmer"
                        ? "Farm or grower name"
                        : "Restaurant name",
                    )}
                    <input
                      name="name"
                      autoComplete="organization"
                      placeholder={t(
                        actor === "farmer"
                          ? "The name buyers will see"
                          : "The name farmers will see",
                      )}
                      required
                      minLength={2}
                      maxLength={100}
                      disabled={busy}
                    />
                  </label>
                  <label className="welcome-field">
                    {t("Town or location")}
                    <span className="welcome-location">
                      <MapPin size={17} />
                      <input
                        name="location"
                        autoComplete="address-level2"
                        placeholder={t("For example, Mangaluru")}
                        required
                        minLength={2}
                        maxLength={120}
                        disabled={busy}
                      />
                    </span>
                  </label>
                  <button className="welcome-submit" disabled={busy}>
                    {t(
                      busy ? "Preparing your workspace…" : "Open my workspace",
                    )}
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}
              {stage === "login" && (
                <details className="welcome-demo">
                  <summary>
                    {t("Exploring the demo?")}
                    <ChevronDown size={15} />
                  </summary>
                  <p>
                    {t(
                      "Choose one of four separate demo accounts. Each has its own workspace.",
                    )}
                  </p>
                  <div className="welcome-demo-accounts">
                    {[
                      ["farmer", "Farmer"],
                      ["restaurant1", "Restaurant 1"],
                      ["restaurant2", "Restaurant 2"],
                      ["restaurant3", "Restaurant 3"],
                    ].map(([user, label]) => (
                      <button
                        key={user}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setUsername(user);
                          setPassword("Harvest@123");
                        }}
                      >
                        {user === "farmer" ? (
                          <Sprout size={16} />
                        ) : (
                          <Store size={16} />
                        )}
                        <span>
                          {t(label)}
                          <small>{user}</small>
                        </span>
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                  <p>
                    {t("Demo password:")} <code>Harvest@123</code>
                  </p>
                </details>
              )}
              <div className="welcome-form-note">
                <ShieldCheck size={15} />
                <span>
                  {t("Demo payments are simulated. No real money moves.")}
                </span>
              </div>
              {busy && (
                <span className="welcome-sr" role="status">
                  {t("Please wait while your request completes.")}
                </span>
              )}
            </div>
          </section>
        </main>
      )}
      {stage === "landing" && (
        <section className="welcome-explainer" id="welcome-how">
          <div className="welcome-explainer-heading">
            <div className="welcome-kicker">
              <span />
              {t("THE WAY FORWARD")}
            </div>
            <h2>
              {t("Less distance.")} <em>{t("More possibility.")}</em>
            </h2>
            <p>
              {t("Simple steps from available harvest to an agreed order.")}
            </p>
          </div>
          <div className="welcome-step-grid">
            {[
              {
                number: "01",
                icon: Sprout,
                title: "Share what you grow.",
                description:
                  "List your harvest, available quantity and your own selling limits.",
              },
              {
                number: "02",
                icon: Sparkles,
                title: "Let good matches find you.",
                description:
                  "Nearby kitchens set their requirements. Agents compare and negotiate within approved limits.",
              },
              {
                number: "03",
                icon: ShieldCheck,
                title: "Keep the final say.",
                description:
                  "The farmer chooses the buyer. Both sides confirm before a simulated payment and collection.",
              },
            ].map((step) => (
              <article key={step.number}>
                <div>
                  <span>{step.number}</span>
                  <step.icon size={24} />
                </div>
                <h3>{t(step.title)}</h3>
                <p>{t(step.description)}</p>
              </article>
            ))}
          </div>
          <button className="welcome-explainer-cta" onClick={openLogin}>
            {t("Find your place in the network")}
            <ArrowRight size={18} />
          </button>
        </section>
      )}
      <footer className="welcome-footer">
        <span>
          <Sprout size={15} />
          HarvestLink
        </span>
        <span>
          {t("A farmer-first marketplace demo. Built for human decisions.")}
        </span>
        <span>{t("Grow. Connect. Thrive.")}</span>
      </footer>
    </div>
  );
}
