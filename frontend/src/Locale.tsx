import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import prepared from "./translations.json";
const dictionaries = prepared as Record<string, Record<string, string>>;
dictionaries["kn-IN"] = {
  ...dictionaries["kn-IN"],
  "My harvest": "ನನ್ನ ಬೆಳೆ",
  Overview: "ಮುಖ್ಯ ಪುಟ",
  Orders: "ಆರ್ಡರ್‌ಗಳು",
  Negotiations: "ಬೆಲೆ ಮಾತುಕತೆ",
  "Ask Madhu": "ಮಧುವನ್ನು ಕೇಳಿ",
};
export const languages: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "हिन्दी",
  "kn-IN": "ಕನ್ನಡ",
  "ta-IN": "தமிழ்",
  "te-IN": "తెలుగు",
  "ml-IN": "മലയാളം",
  "mr-IN": "मराठी",
  "gu-IN": "ગુજરાતી",
  "bn-IN": "বাংলা",
  "pa-IN": "ਪੰਜਾਬੀ",
  "od-IN": "ଓଡ଼ିଆ",
};
type Locale = {
  language: string;
  setLanguage: (s: string) => void;
  tr: (s: string) => string;
  status: string;
};
const Context = createContext<Locale>({
  language: "en-IN",
  setLanguage: () => {},
  tr: (s) => s,
  status: "",
});
export const useLocale = () => useContext(Context);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState(() => {
    const stored = localStorage.getItem("harvest-language") || "en-IN";
    return stored in languages ? stored : "en-IN";
  });
  const [catalog, setCatalog] = useState<Record<string, string>>(
    dictionaries[language] || {},
  );
  const [status, setStatus] = useState("");
  const pending = useRef(new Set<string>());
  const failed = useRef(new Set<string>());
  const active = useRef(false);
  const version = useRef(0);
  function setLanguage(value: string) {
    version.current++;
    pending.current.clear();
    failed.current.clear();
    setCatalog(dictionaries[value] || {});
    setLang(value);
    localStorage.setItem("harvest-language", value);
    setStatus("");
  }
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    const timer = setInterval(async () => {
      if (language === "en-IN" || active.current || !pending.current.size)
        return;
      const texts = [...pending.current].slice(0, 75);
      texts.forEach((t) => pending.current.delete(t));
      const current = version.current;
      active.current = true;
      setStatus("Translating…");
      try {
        const r = await fetch("/api/localize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language, texts }),
        });
        const d = await r.json();
        if (!r.ok) throw Error(d.detail);
        if (current === version.current) {
          setCatalog((c) => ({ ...c, ...d.translations }));
          setStatus("");
        }
      } catch {
        if (current === version.current) {
          texts.forEach((t) => failed.current.add(t));
          setStatus("Translation unavailable · English shown");
        }
      } finally {
        active.current = false;
      }
    }, 300);
    return () => clearInterval(timer);
  }, [language]);
  const tr = (text: string) => {
    if (
      language === "en-IN" ||
      !text.trim() ||
      /^[\s\d₹.,/·—%+–-]+$/.test(text)
    )
      return text;
    if (/^[A-Z]$/.test(text)) return text;
    if (catalog[text]) return catalog[text];
    if (!failed.current.has(text)) pending.current.add(text);
    return text;
  };
  return (
    <Context.Provider value={{ language, setLanguage, tr, status }}>
      {children}
    </Context.Provider>
  );
}
export function LanguagePicker() {
  const { language, setLanguage, tr, status } = useLocale();
  return (
    <div className="language-picker">
      <label>
        <span aria-hidden="true">◎</span>
        <select
          aria-label="Language / भाषा"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {Object.entries(languages).map(([code, label]) => (
            <option value={code} key={code}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {status && <small role="status">{tr(status)}</small>}
    </div>
  );
}
