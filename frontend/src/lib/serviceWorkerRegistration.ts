const SERVICE_WORKER_URL = "/service-worker.js";
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

async function attemptRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: "/",
    });

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    return registration;
  } catch (error) {
    console.error("Service worker registration failed", error);
    return null;
  }
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    // Allow service worker in development for easier testing, but skip automatic registration
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    return;
  }

  if (registrationPromise) {
    return;
  }

  registrationPromise = new Promise((resolve) => {
    const register = () => {
      attemptRegistration().then(resolve);
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  });
}

export function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!registrationPromise) {
    registerServiceWorker();
  }
  return registrationPromise ?? Promise.resolve(null);
}
