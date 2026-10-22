import { useEffect, useState } from "react";

type HealthStatus = "checking" | "online" | "offline";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function App() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [installMessage, setInstallMessage] = useState("");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) throw new Error("API request failed");
        return response.json();
      })
      .then(() => setStatus("online"))
      .catch(() => setStatus("offline"));
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallAvailable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallAvailable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      const isAppleMobile =
        /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setInstallMessage(
        isAppleMobile
          ? "In Safari, tap Share, then Add to Home Screen."
          : "Open your browser menu and choose Install app or Add to Home Screen.",
      );
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallMessage(choice.outcome === "accepted" ? "App installed." : "");
    setInstallPrompt(null);
  };

  return (
    <main className="shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="one-zero-two home">
          <span className="wordmark-mark">102</span>
          <span>one-zero-two</span>
        </a>
        <span className={`service-status service-status--${status}`}>
          <span className="status-dot" />
          API {status}
        </span>
      </header>

      <section className="welcome" aria-labelledby="welcome-title">
        <p className="eyebrow">THE WORKSPACE IS READY</p>
        <h1 id="welcome-title">A clear start.</h1>
        <p className="welcome-copy">
          Your React frontend is connected to the Express API. Build from here.
        </p>
        <div className="stack-line">
          <span>React</span>
          <span className="separator">/</span>
          <span>TypeScript</span>
          <span className="separator">/</span>
          <span>Vite</span>
        </div>
        {!isInstalled && (
          <div className="install-area">
            <button
              className="install-button"
              onClick={handleInstall}
              type="button"
            >
              Install app
            </button>
            <p aria-live="polite" className="install-hint" role="status">
              {installMessage}
            </p>
          </div>
        )}
      </section>
      <footer>
        one-zero-two <span>·</span> development environment
      </footer>
    </main>
  );
}

export default App;
