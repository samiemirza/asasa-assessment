/**
 * Device-local biometric confirmation through WebAuthn platform authenticators
 * (Face ID, Touch ID, Windows Hello). The first use registers a credential and
 * the gesture itself verifies the user; later uses assert against it. Nothing
 * is checked server side: this demo has no accounts, so the gate is a real
 * biometric prompt on the device, not a server-verified signature.
 */
const KEY = "asasa.webauthn.credential";

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;

export async function biometricsAvailable(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential || !window.isSecureContext) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function register(): Promise<boolean> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Asasa Gold", id: location.hostname },
      user: { id: new TextEncoder().encode("asasa-demo-customer"), name: "samie.ahmad2003@gmail.com", displayName: "Samie Ahmad" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60_000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) return false;
  try {
    localStorage.setItem(KEY, toB64(cred.rawId));
  } catch {
    /* storage unavailable: next time registers again */
  }
  return true;
}

export async function verifyWithBiometrics(): Promise<boolean> {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    if (!stored) return await register();
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: location.hostname,
        userVerification: "required",
        allowCredentials: [{ id: fromB64(stored), type: "public-key" }],
        timeout: 60_000,
      },
    });
    return !!cred;
  } catch {
    // The stored credential may have been removed from the device: register afresh once.
    try {
      localStorage.removeItem(KEY);
      return await register();
    } catch {
      return false;
    }
  }
}
