import "@testing-library/jest-dom/vitest";

// Mock Firebase modules globally
vi.mock("../firebase.js", () => ({
  db: {},
  auth: { currentUser: null, signOut: vi.fn() },
  googleProvider: {},
  analytics: {},
  storage: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  setDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: "mock-id" })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  serverTimestamp: vi.fn(() => ({ _type: "serverTimestamp" })),
  increment: vi.fn(n => ({ _type: "increment", value: n })),
  writeBatch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn(() => Promise.resolve()) })),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn((auth, cb) => { cb(null); return vi.fn(); }),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  EmailAuthProvider: vi.fn(),
}));

vi.mock("firebase/analytics", () => ({
  logEvent: vi.fn(),
  getAnalytics: vi.fn(),
}));

vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

// Mock URL.createObjectURL / revokeObjectURL for CSV tests
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();
