// Cryptographic utilities for secure pairing

// Word list for passphrase generation (BIP39-inspired but shorter)
const WORD_LIST = [
  "apple", "banana", "cherry", "dragon", "eagle", "falcon", "grape", "honey",
  "island", "jungle", "koala", "lemon", "mango", "nectar", "orange", "pearl",
  "quartz", "river", "sunset", "tiger", "umbrella", "violet", "walnut", "xenon",
  "yellow", "zebra", "anchor", "bridge", "castle", "dolphin", "ember", "frost",
  "garden", "harbor", "igloo", "jasper", "kite", "lotus", "meadow", "north",
  "ocean", "piano", "quest", "rainbow", "silver", "thunder", "unity", "valley",
  "wonder", "crystal", "blaze", "cloud", "dawn", "echo", "flame", "glow",
  "haven", "ivory", "jade", "karma", "lunar", "mystic", "nova", "oasis",
];

// Generate a secure random passphrase (6 words)
export function generatePassphrase(): string {
  const words: string[] = [];
  const randomValues = new Uint32Array(6);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < 6; i++) {
    const index = randomValues[i] % WORD_LIST.length;
    words.push(WORD_LIST[index]);
  }

  return words.join("-");
}

// Generate a 6-digit pairing code for display
export function generatePairingCode(): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return String(randomValues[0] % 1000000).padStart(6, "0");
}

// Generate a unique device ID
export function generateDeviceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate a session token
export async function generateSessionToken(
  desktopId: string,
  mobileId: string,
  passphrase: string
): Promise<string> {
  const data = `${desktopId}:${mobileId}:${passphrase}:${Date.now()}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Validate session token format
export function isValidSessionToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

// Generate a unique message ID
export function generateMessageId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
