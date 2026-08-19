/**
 * LocalHub Firebase Configuration & Backend Service
 * Firebase Web SDK v10 ESM Imports via CDN
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  writeBatch,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Client Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmriohXFENF1Xm-gUfA9aoUtdB7Z1tGGY",
  authDomain: "event-hub-f8551.firebaseapp.com",
  projectId: "event-hub-f8551",
  storageBucket: "event-hub-f8551.firebasestorage.app",
  messagingSenderId: "581886241015",
  appId: "1:581886241015:web:9a904ec02c4bb4c9308bf2"
};

// Initialize Firebase App & Services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Deep Sanitizer: Removes circular structures, functions, DOM/Firebase internal nodes,
 * and converts Firestore Timestamps / Dates into ISO strings.
 */
export function sanitizeForStorage(obj, seen = new WeakSet()) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== "object") {
    if (typeof obj === "function" || typeof obj === "symbol") return undefined;
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Firestore Timestamp handling
  if (typeof obj.toDate === "function") {
    try {
      return obj.toDate().toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  }

  // Prevent Firestore internal references / delegates
  if (obj._key || obj.firestore || obj._delegate || obj.constructor?.name === "DocumentReference" || obj.constructor?.name === "FieldValue") {
    return obj.id || obj.path || undefined;
  }

  // Break circular reference loops
  if (seen.has(obj)) {
    return undefined;
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj
      .map(item => sanitizeForStorage(item, seen))
      .filter(item => item !== undefined);
  }

  const cleaned = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith("_") || key === "auth" || key === "proactiveRefresh" || key === "reloadListener" || key === "stsTokenManager") {
      continue;
    }
    try {
      const val = sanitizeForStorage(obj[key], seen);
      if (val !== undefined) {
        cleaned[key] = val;
      }
    } catch (e) {}
  }
  return cleaned;
}

export function safeJsonStringify(data, fallback = "{}") {
  try {
    const sanitized = sanitizeForStorage(data);
    return JSON.stringify(sanitized);
  } catch (err) {
    console.warn("Circular structure intercepted in safeJsonStringify:", err);
    try {
      const cache = new Set();
      return JSON.stringify(data, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (cache.has(value)) return;
          cache.add(value);
        }
        return value;
      });
    } catch (e) {
      return fallback;
    }
  }
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    uid: String(user.uid || "usr-" + Date.now()),
    name: String(user.name || user.displayName || (user.email ? user.email.split("@")[0] : "Local Resident")),
    email: String(user.email || ""),
    role: String(user.role || "customer"),
    createdAt: user.createdAt || new Date().toISOString()
  };
}

// Local session cache for instant client rendering
function getSavedLocalUser() {
  try {
    const raw = localStorage.getItem("lh_firebase_user");
    if (!raw) return null;
    return sanitizeUser(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

let currentLocalUser = getSavedLocalUser();

export const DEFAULT_SERVICES = [
  {
    id: "srv-decor-1",
    title: "Custom Wall Staging & Art Mounting",
    category: "home-decor",
    categoryLabel: "Home Decoration",
    price: 95.00,
    unit: "job",
    description: "Professional wall staging, precision picture hanging, and aesthetic centerpiece arrangement.",
    iconClass: "🏡",
    providerId: "provider-demo-1",
    rating: 4.9,
    createdAt: new Date().toISOString()
  },
  {
    id: "srv-decor-2",
    title: "Floating Shelves Installation",
    category: "home-decor",
    categoryLabel: "Home Decoration",
    price: 110.00,
    unit: "job",
    description: "Heavy-duty wall anchors, stud detection, and laser-leveled floating wooden shelves setup.",
    iconClass: "🪜",
    providerId: "provider-demo-1",
    rating: 5.0,
    createdAt: new Date().toISOString()
  },
  {
    id: "srv-decor-3",
    title: "Festive & Ambient Room Staging",
    category: "home-decor",
    categoryLabel: "Home Decoration",
    price: 135.00,
    unit: "room",
    description: "Holiday lighting, cozy drapery accents, and bespoke interior styling for events or seasons.",
    iconClass: "✨",
    providerId: "provider-demo-1",
    rating: 4.8,
    createdAt: new Date().toISOString()
  },
  {
    id: "srv-clean-1",
    title: "Deep House Sanitization & Sweeping",
    category: "cleaning",
    categoryLabel: "Sweeping & Cleaning",
    price: 80.00,
    unit: "session",
    description: "Whole-home dust sweeping, floor polishing, and eco-friendly antibacterial surface treatment.",
    iconClass: "🧹",
    providerId: "provider-demo-2",
    rating: 4.9,
    createdAt: new Date().toISOString()
  },
  {
    id: "srv-clean-2",
    title: "High-Pressure Carpet Scrubbing",
    category: "cleaning",
    categoryLabel: "Sweeping & Cleaning",
    price: 120.00,
    unit: "room",
    description: "Deep fiber shampoo extraction, pet odor eradication, and rapid heated dry wash.",
    iconClass: "🧼",
    providerId: "provider-demo-2",
    rating: 5.0,
    createdAt: new Date().toISOString()
  },
  {
    id: "srv-clean-3",
    title: "Intensive Kitchen & Bath Sterilization",
    category: "cleaning",
    categoryLabel: "Sweeping & Cleaning",
    price: 150.00,
    unit: "job",
    description: "Grout scrubbing, oven degreasing, tile descaling, and high-heat steam sterilization.",
    iconClass: "🧽",
    providerId: "provider-demo-2",
    rating: 4.9,
    createdAt: new Date().toISOString()
  },
  {
    id: "srv-rental-1",
    title: "Tesla Model 3 Long Range",
    category: "car-rentals",
    categoryLabel: "Car Rentals",
    price: 95.00,
    unit: "day",
    description: "Full self-driving capable electric sedan, 350-mile battery, contactless mobile unlock.",
    iconClass: "⚡",
    providerId: "provider-demo-3",
    rating: 5.0,
    createdAt: new Date().toISOString()
  },
  {
    id: "srv-rental-2",
    title: "Ford Bronco 4x4 Off-Roader",
    category: "car-rentals",
    categoryLabel: "Car Rentals",
    price: 110.00,
    unit: "day",
    description: "Rugged all-terrain SUV with removable roof panels, high ground clearance, and GPS tracker.",
    iconClass: "🚙",
    providerId: "provider-demo-3",
    rating: 4.8,
    createdAt: new Date().toISOString()
  },
  {
    id: "srv-rental-3",
    title: "Ford Mustang V8 Convertible",
    category: "car-rentals",
    categoryLabel: "Car Rentals",
    price: 125.00,
    unit: "day",
    description: "American muscle pony car with soft-top convertible, premium sound system, and sport mode.",
    iconClass: "🏎️",
    providerId: "provider-demo-3",
    rating: 4.9,
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_SUPPLIES = [
  {
    id: "sup-decor-1",
    title: "Warm Fairy Ambient String Lights (50ft)",
    category: "decor-supplies",
    categoryLabel: "Decor Supplies",
    price: 18.00,
    unit: "pack",
    description: "Waterproof micro LED copper wire fairy lights with 8 flashing modes and remote control.",
    iconClass: "💡",
    stock: 45,
    providerId: "provider-demo-1",
    createdAt: new Date().toISOString()
  },
  {
    id: "sup-decor-2",
    title: "Heavy-Duty Wall Anchor & Screw Kit (100pc)",
    category: "decor-supplies",
    categoryLabel: "Decor Supplies",
    price: 14.50,
    unit: "pack",
    description: "Self-drilling drywall nylon anchors with zinc-plated mounting screws up to 50 lbs capacity.",
    iconClass: "🔩",
    stock: 60,
    providerId: "provider-demo-1",
    createdAt: new Date().toISOString()
  },
  {
    id: "sup-decor-3",
    title: "Botanical Garland & Eucalyptus Vines (6-pack)",
    category: "decor-supplies",
    categoryLabel: "Decor Supplies",
    price: 22.00,
    unit: "pack",
    description: "Realistic faux greenery vines for door arches, floating shelves, and banquet backdrops.",
    iconClass: "🌿",
    stock: 30,
    providerId: "provider-demo-1",
    createdAt: new Date().toISOString()
  },
  {
    id: "sup-decor-4",
    title: "Eco-Friendly Surface Sanitizer Spray (32oz)",
    category: "decor-supplies",
    categoryLabel: "Cleaning Supplies",
    price: 12.00,
    unit: "bottle",
    description: "Plant-derived hospital-grade disinfectant spray safe for kids, hardwood, marble, and pets.",
    iconClass: "🧴",
    stock: 80,
    providerId: "provider-demo-2",
    createdAt: new Date().toISOString()
  }
];

function getLocalCustomServices() {
  try {
    return JSON.parse(localStorage.getItem("lh_local_services") || "[]");
  } catch (e) {
    return [];
  }
}

function saveLocalCustomService(item) {
  const existing = getLocalCustomServices();
  const cleanItem = sanitizeForStorage(item);
  existing.unshift(cleanItem);
  localStorage.setItem("lh_local_services", safeJsonStringify(existing));
}

function getLocalCustomSupplies() {
  try {
    return JSON.parse(localStorage.getItem("lh_local_supplies") || "[]");
  } catch (e) {
    return [];
  }
}

function saveLocalCustomSupply(item) {
  const existing = getLocalCustomSupplies();
  const cleanItem = sanitizeForStorage(item);
  existing.unshift(cleanItem);
  localStorage.setItem("lh_local_supplies", safeJsonStringify(existing));
}

function getLocalOrders() {
  try {
    const raw = localStorage.getItem("lh_local_orders");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// Global cross-tab & in-memory instant synchronization bus
const orderSyncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("lh_orders_bus") : null;
const activeOrderListeners = new Set();

function notifyAllOrderListeners() {
  const localOrders = getLocalOrders();
  activeOrderListeners.forEach(listener => {
    try {
      listener.callback(listener.filterFn ? listener.filterFn(localOrders) : localOrders);
    } catch (e) {
      console.warn("Order listener notification notice:", e);
    }
  });
}

if (orderSyncChannel) {
  orderSyncChannel.onmessage = () => {
    notifyAllOrderListeners();
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "lh_local_orders") {
      notifyAllOrderListeners();
    }
  });
  window.addEventListener("lh_orders_changed", () => {
    notifyAllOrderListeners();
  });
}

function saveLocalOrder(order) {
  const cleanOrder = sanitizeForStorage(order);
  const orders = getLocalOrders();
  const index = orders.findIndex(o => (o.id && o.id === cleanOrder.id) || (o.orderNumber && o.orderNumber === cleanOrder.orderNumber));
  if (index >= 0) {
    orders[index] = { ...orders[index], ...cleanOrder };
  } else {
    orders.unshift(cleanOrder);
  }
  localStorage.setItem("lh_local_orders", safeJsonStringify(orders));
  
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("lh_orders_changed", { detail: { orderId: cleanOrder.id } }));
    } catch (e) {}
  }
  if (orderSyncChannel) {
    try {
      orderSyncChannel.postMessage({ type: "ORDER_UPDATED", timestamp: Date.now() });
    } catch (e) {}
  }
  notifyAllOrderListeners();
}

/**
 * Custom Error Handler for Firestore / Auth Operations
 */
export function handleFirebaseError(error, context = "Operation") {
  console.error(`[Firebase ${context} Error]:`, error);
  const message = error?.message || "An unexpected error occurred with Firebase.";
  return { success: false, message };
}

/**
 * 1. Authentication & Role-Based Profiles
 * Collection Model:
 * - users/{uid} — { uid, name, email, role, createdAt }
 * - customerProfiles/{uid} — customer specific profile
 * - providerProfiles/{uid} — provider specific profile
 */

export async function signUpUser(email, password, name, role) {
  try {
    const selectedRole = role || "customer";
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userIdentity = {
      uid: user.uid,
      name,
      email: user.email,
      role: selectedRole,
      createdAt: new Date().toISOString()
    };

    // 1. Shared users doc
    const userRef = doc(db, "users", user.uid);

    // 2. Separate Role-Specific Profile doc
    let profileRef;
    let profileData;
    if (selectedRole === "provider") {
      profileRef = doc(db, "providerProfiles", user.uid);
      profileData = {
        uid: user.uid,
        businessName: name + " Services",
        bio: "Certified local service provider.",
        servicesOffered: [],
        availability: "available",
        rating: 5.0,
        verificationStatus: "verified",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      profileRef = doc(db, "customerProfiles", user.uid);
      profileData = {
        uid: user.uid,
        address: "",
        phone: "",
        preferences: {},
        savedPaymentInfo: {},
        favoriteServices: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const batch = writeBatch(db);
      batch.set(userRef, userIdentity);
      batch.set(profileRef, profileData);
      await batch.commit();
      console.info(`✔ [Firestore Batch Commit] Created users/${user.uid} and ${selectedRole}Profiles/${user.uid}`);
    } catch (batchErr) {
      console.warn("Batch commit notice, attempting individual document writes:", batchErr);
      await setDoc(userRef, userIdentity);
      await setDoc(profileRef, profileData);
      console.info(`✔ [Firestore setDoc] Created users/${user.uid} and ${selectedRole}Profiles/${user.uid}`);
    }

    currentLocalUser = sanitizeUser(userIdentity);
    localStorage.setItem("lh_firebase_user", safeJsonStringify(currentLocalUser));

    return { success: true, user: currentLocalUser };
  } catch (error) {
    console.error("[Firebase SignUp Error]:", error);

    if (error.code === "auth/weak-password") {
      return { success: false, message: "Password must be at least 6 characters long." };
    }
    if (error.code === "auth/email-already-in-use") {
      return { success: false, message: "This email is already registered. Please sign in instead." };
    }

    return handleFirebaseError(error, "SignUp");
  }
}

export async function signInUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user identity metadata from Firestore users/{uid}
    let userProfile = null;
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const docData = sanitizeForStorage(docSnap.data());
        userProfile = sanitizeUser({ uid: user.uid, ...docData });
      }
    } catch (fetchErr) {
      console.warn("User profile fetch fallback:", fetchErr);
    }

    if (!userProfile) {
      userProfile = sanitizeUser({
        uid: user.uid,
        name: user.displayName || (user.email ? user.email.split("@")[0] : "Local Resident"),
        email: user.email,
        role: "customer"
      });
    }

    currentLocalUser = userProfile;
    localStorage.setItem("lh_firebase_user", safeJsonStringify(userProfile));

    return { success: true, user: userProfile };
  } catch (error) {
    console.error("[Firebase SignIn Error]:", error);

    if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      return { success: false, message: "Invalid email or password. Please check your credentials or create an account." };
    }

    return handleFirebaseError(error, "SignIn");
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Sign out notice:", e);
  }
  currentLocalUser = null;
  localStorage.removeItem("lh_firebase_user");
  window.location.href = "./index.html";
}

export function subscribeAuthState(callback) {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (docSnap.exists()) {
          const docData = sanitizeForStorage(docSnap.data());
          currentLocalUser = sanitizeUser({ uid: firebaseUser.uid, ...docData });
        } else {
          currentLocalUser = sanitizeUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Local Resident"),
            role: "customer"
          });
        }
      } catch (e) {
        console.warn("[AuthState profile fetch info]: Using cached profile metadata:", e);
        if (!currentLocalUser || currentLocalUser.uid !== firebaseUser.uid) {
          currentLocalUser = sanitizeUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Local Resident"),
            role: "customer"
          });
        }
      }
      localStorage.setItem("lh_firebase_user", safeJsonStringify(currentLocalUser));
      callback(currentLocalUser);
    } else {
      currentLocalUser = null;
      localStorage.removeItem("lh_firebase_user");
      callback(null);
    }
  });
}

export function getCurrentUser() {
  if (currentLocalUser) return currentLocalUser;
  try {
    const raw = localStorage.getItem("lh_firebase_user");
    if (!raw) return null;
    return sanitizeUser(JSON.parse(raw));
  } catch (e) {
    return null;
  }
}

/**
 * 2. Role Profile Getters / Updaters
 */

export async function getCustomerProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "customerProfiles", uid));
    if (snap.exists()) return snap.data();
  } catch (err) {
    console.error("[Firestore getCustomerProfile Error]:", err);
  }
  return null;
}

export async function updateCustomerProfile(uid, data) {
  try {
    await updateDoc(doc(db, "customerProfiles", uid), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err) {
    console.error("[Firestore updateCustomerProfile Error]:", err);
    return { success: false, message: err.message };
  }
}

export async function getProviderProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "providerProfiles", uid));
    if (snap.exists()) return snap.data();
  } catch (err) {
    console.error("[Firestore getProviderProfile Error]:", err);
  }
  return null;
}

export async function updateProviderProfile(uid, data) {
  try {
    await updateDoc(doc(db, "providerProfiles", uid), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err) {
    console.error("[Firestore updateProviderProfile Error]:", err);
    return { success: false, message: err.message };
  }
}

/**
 * 3. Services & Supplies Catalog (Dynamic Firestore Queries + Fallback Seeds)
 */

export async function getServices() {
  const localList = getLocalCustomServices();
  try {
    const snap = await getDocs(collection(db, "services"));
    if (!snap.empty) {
      const firestoreServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const map = new Map();
      DEFAULT_SERVICES.forEach(s => map.set(s.id, s));
      firestoreServices.forEach(s => map.set(s.id, s));
      localList.forEach(s => map.set(s.id, s));
      return Array.from(map.values());
    }
  } catch (e) {
    console.warn("[Firestore getServices] Offline or query notice — using cached catalog:", e);
  }
  const map = new Map();
  DEFAULT_SERVICES.forEach(s => map.set(s.id, s));
  localList.forEach(s => map.set(s.id, s));
  return Array.from(map.values());
}

export async function getSupplyItems() {
  const localList = getLocalCustomSupplies();
  try {
    const snap = await getDocs(collection(db, "supplies"));
    if (!snap.empty) {
      const firestoreSupplies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const map = new Map();
      DEFAULT_SUPPLIES.forEach(s => map.set(s.id, s));
      firestoreSupplies.forEach(s => map.set(s.id, s));
      localList.forEach(s => map.set(s.id, s));
      return Array.from(map.values());
    }
  } catch (e) {
    console.warn("[Firestore getSupplyItems] Offline or query notice — using cached supplies:", e);
  }
  const map = new Map();
  DEFAULT_SUPPLIES.forEach(s => map.set(s.id, s));
  localList.forEach(s => map.set(s.id, s));
  return Array.from(map.values());
}

export async function createService(serviceData) {
  const serviceId = "srv-" + Date.now();
  const servicePayload = {
    id: serviceId,
    title: serviceData.title,
    category: serviceData.category,
    categoryLabel: serviceData.categoryLabel || serviceData.category,
    price: parseFloat(serviceData.price),
    unit: serviceData.unit || "job",
    description: serviceData.description || "",
    iconClass: serviceData.iconClass || "🛠️",
    providerId: serviceData.providerId || (auth.currentUser ? auth.currentUser.uid : "unassigned"),
    rating: 5.0,
    createdAt: new Date().toISOString()
  };

  saveLocalCustomService(servicePayload);

  try {
    const newDocRef = doc(collection(db, "services"));
    servicePayload.id = newDocRef.id;
    await setDoc(newDocRef, servicePayload);
    console.info("✔ [Firestore] Service document created in 'services/" + newDocRef.id + "'");
  } catch (err) {
    console.warn("[Firestore createService Notice]: Stored locally:", err);
  }

  return { success: true, service: servicePayload };
}

export async function createSupply(supplyData) {
  const supplyId = "sup-" + Date.now();
  const supplyPayload = {
    id: supplyId,
    title: supplyData.title,
    category: "decor-supplies",
    categoryLabel: supplyData.categoryLabel || "Decor Supplies",
    price: parseFloat(supplyData.price),
    unit: supplyData.unit || "pack",
    description: supplyData.description || "",
    iconClass: supplyData.iconClass || "📦",
    stock: parseInt(supplyData.stock) || 50,
    providerId: supplyData.providerId || (auth.currentUser ? auth.currentUser.uid : "unassigned"),
    createdAt: new Date().toISOString()
  };

  saveLocalCustomSupply(supplyPayload);

  try {
    const newDocRef = doc(collection(db, "supplies"));
    supplyPayload.id = newDocRef.id;
    await setDoc(newDocRef, supplyPayload);
    console.info("✔ [Firestore] Supply document created in 'supplies/" + newDocRef.id + "'");
  } catch (err) {
    console.warn("[Firestore createSupply Notice]: Stored locally:", err);
  }

  return { success: true, supply: supplyPayload };
}

/**
 * 4. Orders & Reviews Management
 */

export async function createOrder(orderData) {
  const user = auth.currentUser;
  const customerId = user ? user.uid : orderData.customerId || orderData.customerUid || "cust-" + Date.now();

  const newOrder = {
    id: "ord-" + Date.now(),
    orderNumber: orderData.orderNumber || "LH-" + Math.floor(1000 + Math.random() * 9000),
    customerId: customerId,
    customerName: orderData.customerName || "Customer",
    customerEmail: orderData.customerEmail || (user ? user.email : ""),
    providerId: orderData.providerId || "unassigned",
    serviceId: orderData.serviceId,
    serviceTitle: orderData.serviceTitle,
    serviceCategory: orderData.serviceCategory,
    price: parseFloat(orderData.price || 0),
    supplies: orderData.supplies || [],
    suppliesTotal: parseFloat(orderData.suppliesTotal || 0),
    subtotal: parseFloat(orderData.subtotal || 0),
    tax: parseFloat(orderData.tax || 0),
    platformFee: parseFloat(orderData.platformFee || 5.00),
    totalPrice: parseFloat(orderData.totalPrice || 0),
    date: orderData.date,
    time: orderData.time,
    status: orderData.status || "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rating: null,
    reviewText: null,
    deliveredAt: null,
    paidAt: null
  };

  saveLocalOrder(newOrder);

  try {
    const docRef = await addDoc(collection(db, "orders"), newOrder);
    newOrder.id = docRef.id;
    saveLocalOrder(newOrder);
    console.info("✔ [Firestore] Created order document in 'orders/" + docRef.id + "'");
  } catch (err) {
    console.warn("[Firestore createOrder Notice]: Order stored in local state:", err);
  }

  return newOrder;
}

export function listenToActiveOrders(user, callback) {
  if (!user) {
    callback([]);
    return () => {};
  }

  const filterFn = (ordersList) => {
    if (user.role === "customer") {
      return ordersList.filter(o => o.customerId === user.uid || o.customerEmail === user.email);
    } else if (user.role === "provider") {
      // Providers see all pending requests or orders assigned to them or unassigned
      return ordersList.filter(o => 
        o.status === "pending" || 
        o.providerId === user.uid || 
        o.providerId === "unassigned" || 
        !o.providerId || 
        (o.providerId && o.providerId.startsWith("provider-"))
      );
    } else if (user.role === "delivery") {
      // Delivery fleet sees dispatched, executing, and pending confirmation orders
      return ordersList.filter(o => 
        ["dispatched", "executing", "delivered_pending_confirmation", "delivered", "accepted"].includes(o.status)
      );
    }
    return ordersList;
  };

  const dispatchOrders = (firestoreOrders = []) => {
    const localOrders = getLocalOrders();
    const map = new Map();
    localOrders.forEach(o => map.set(o.id || o.orderNumber, o));
    firestoreOrders.forEach(o => map.set(o.id || o.orderNumber, o));
    const merged = Array.from(map.values());
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(filterFn(merged));
  };

  const listenerRecord = { user, callback, filterFn };
  activeOrderListeners.add(listenerRecord);

  // Immediate dispatch of local orders
  dispatchOrders([]);

  try {
    let q;
    if (user.role === "customer") {
      q = query(collection(db, "orders"), where("customerId", "==", user.uid));
    } else {
      q = query(collection(db, "orders"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach(docSnap => {
        const rawData = docSnap.data();
        const cleanData = sanitizeForStorage(rawData);
        orders.push({ id: docSnap.id, ...cleanData });
      });
      dispatchOrders(orders);
    }, (error) => {
      console.warn("[Firestore Listen Notice]: Using local order state:", error);
      dispatchOrders([]);
    });

    return () => {
      activeOrderListeners.delete(listenerRecord);
      unsubscribe();
    };
  } catch (err) {
    console.warn("[Firestore Listen Exception]:", err);
    dispatchOrders([]);
    return () => {
      activeOrderListeners.delete(listenerRecord);
    };
  }
}

export async function updateOrderStatus(orderId, status, providerUid) {
  const user = auth.currentUser;
  const activeProviderUid = providerUid || (user ? user.uid : "unassigned");

  const updateFields = {
    status,
    updatedAt: new Date().toISOString()
  };

  if (status === "accepted" || status === "dispatched" || status === "executing") {
    updateFields.providerId = activeProviderUid;
  }

  if (status === "delivered") {
    updateFields.deliveredAt = new Date().toISOString();
  } else if (status === "paid") {
    updateFields.paidAt = new Date().toISOString();
  }

  // Update local order
  const orders = getLocalOrders();
  const found = orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (found) {
    Object.assign(found, updateFields);
    saveLocalOrder(found);
  }

  try {
    await updateDoc(doc(db, "orders", orderId), updateFields);
    console.info(`✔ [Firestore] Order ${orderId} updated to status '${status}'`);
  } catch (err) {
    console.warn("[Firestore updateOrderStatus Notice]: Updated locally:", err);
  }

  return { success: true };
}

/**
 * Reviews Collection Management
 * Collection: reviews/{reviewId} -> { id, orderId, customerId, providerId, rating, text, createdAt }
 */

export async function submitReview(orderId, customerId, providerId, rating, reviewText, tags = [], authorName = "Customer", serviceTitle = "Local Service") {
  const user = auth.currentUser;
  const activeCustomerId = customerId || (user ? user.uid : "cust-" + Date.now());

  const reviewDoc = {
    id: "rev-" + Date.now(),
    orderId: orderId,
    customerId: activeCustomerId,
    customerName: authorName || (user ? (user.name || user.email) : "Customer"),
    providerId: providerId || "unassigned",
    serviceTitle: serviceTitle,
    rating: parseInt(rating) || 5,
    text: reviewText || "",
    tags: Array.isArray(tags) ? tags : [],
    createdAt: new Date().toISOString()
  };

  // Local store save
  try {
    const reviews = JSON.parse(localStorage.getItem("lh_reviews") || "[]");
    reviews.unshift(sanitizeForStorage(reviewDoc));
    localStorage.setItem("lh_reviews", safeJsonStringify(reviews));
  } catch (e) {
    console.warn("Local review storage notice:", e);
  }

  // Update order record
  const orders = getLocalOrders();
  const found = orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (found) {
    found.rating = parseInt(rating);
    found.reviewText = reviewText;
    found.reviewTags = tags;
    saveLocalOrder(found);
  }

  try {
    const cleanDoc = sanitizeForStorage(reviewDoc);
    const reviewRef = await addDoc(collection(db, "reviews"), cleanDoc);
    reviewDoc.id = reviewRef.id;
    await updateDoc(doc(db, "orders", orderId), {
      rating: parseInt(rating),
      reviewText: reviewText || "",
      reviewTags: tags,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[Firestore submitReview Notice]: Stored locally:", err);
  }

  return { success: true, review: reviewDoc };
}

export const INITIAL_FEATURED_REVIEWS = [
  {
    id: "rev-seed-1",
    customerName: "Margaret Hayes",
    district: "Greenwood District",
    avatarBg: "linear-gradient(135deg, #059669, #10b981)",
    avatarInitials: "MH",
    serviceTitle: "Deep House Sanitization & Sweeping",
    rating: 5,
    text: "The sweeper arrived right on the scheduled minute with specialized eco-friendly gear. The house smells incredible and every nook is spotless. Absolute 5-star standard!",
    tags: ["On-Time Arrival", "Eco-Friendly", "Spotless Result"],
    createdAt: "2026-08-18T14:30:00.000Z"
  },
  {
    id: "rev-seed-2",
    customerName: "Terrance Logan",
    district: "Silverwood Heights",
    avatarBg: "linear-gradient(135deg, #6366f1, #3b82f6)",
    avatarInitials: "TL",
    serviceTitle: "Tesla Model 3 Long Range",
    rating: 5,
    text: "The delivery runner arrived directly to my driveway and walked me through the mobile contactless unlock. Manual delivery confirmation gave total peace of mind!",
    tags: ["Seamless Handover", "Pristine Vehicle", "Fast Delivery"],
    createdAt: "2026-08-17T09:15:00.000Z"
  },
  {
    id: "rev-seed-3",
    customerName: "Rachel Kim",
    district: "Oakridge Gardens",
    avatarBg: "linear-gradient(135deg, #f59e0b, #ef4444)",
    avatarInitials: "RK",
    serviceTitle: "Floating Shelves & Lighting Staging",
    rating: 5,
    text: "The decorator was a true artisan. Heavy-duty anchors installed with laser leveling, and the ambient fairy lights transform our entire living room evening vibe!",
    tags: ["Master Craftsmanship", "Laser-Leveled", "Polite Crew"],
    createdAt: "2026-08-16T18:45:00.000Z"
  }
];

export async function getAllReviews() {
  try {
    const local = JSON.parse(localStorage.getItem("lh_reviews") || "[]");
    const snap = await getDocs(collection(db, "reviews"));
    let firestoreReviews = [];
    if (!snap.empty) {
      firestoreReviews = snap.docs.map(d => ({ id: d.id, ...sanitizeForStorage(d.data()) }));
    }
    const map = new Map();
    INITIAL_FEATURED_REVIEWS.forEach(r => map.set(r.id, r));
    firestoreReviews.forEach(r => map.set(r.id, r));
    local.forEach(r => map.set(r.id, r));
    const all = Array.from(map.values());
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return all;
  } catch (e) {
    const local = JSON.parse(localStorage.getItem("lh_reviews") || "[]");
    const map = new Map();
    INITIAL_FEATURED_REVIEWS.forEach(r => map.set(r.id, r));
    local.forEach(r => map.set(r.id, r));
    return Array.from(map.values());
  }
}

export async function getReviewsForProvider(providerId) {
  try {
    const all = await getAllReviews();
    if (!providerId || providerId === "all") return all;
    return all.filter(r => r.providerId === providerId || !r.providerId || r.providerId === "unassigned");
  } catch (err) {
    console.error("[Firestore getReviewsForProvider Error]:", err);
    return INITIAL_FEATURED_REVIEWS;
  }
}

/**
 * 5. Delivery Workflow & Manual Confirmation Actions
 */

export async function markOrderDispatchedForDelivery(orderId, deliverymanInfo = {}) {
  const updateFields = {
    status: "out_for_delivery",
    deliverymanName: deliverymanInfo.name || "Alex Vance (Fleet #4)",
    deliverymanUid: deliverymanInfo.uid || "deliv-01",
    deliverymanPhone: deliverymanInfo.phone || "+1 (555) 234-8890",
    dispatchedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const orders = getLocalOrders();
  const found = orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (found) {
    Object.assign(found, updateFields);
    saveLocalOrder(found);
  }

  try {
    await updateDoc(doc(db, "orders", orderId), updateFields);
  } catch (e) {
    console.warn("Firestore markOrderDispatched notice:", e);
  }
  return { success: true };
}

export async function markCustomerReceivedPendingConfirmation(orderId) {
  const updateFields = {
    status: "delivered_pending_confirmation",
    customerReceivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manualConfirmationRequired: true
  };

  const orders = getLocalOrders();
  const found = orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (found) {
    Object.assign(found, updateFields);
    saveLocalOrder(found);
  }

  try {
    await updateDoc(doc(db, "orders", orderId), updateFields);
  } catch (e) {
    console.warn("Firestore markCustomerReceived notice:", e);
  }
  return { success: true };
}

export async function manualConfirmDeliveryByDeliveryman(orderId, deliveryNotes = "", deliverymanUid = null) {
  const updateFields = {
    status: "delivered",
    deliveryConfirmedByDeliveryman: true,
    deliverymanConfirmationNotes: deliveryNotes || "Handover verified with customer signature.",
    deliveredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const orders = getLocalOrders();
  const found = orders.find(o => o.id === orderId || o.orderNumber === orderId);
  if (found) {
    Object.assign(found, updateFields);
    saveLocalOrder(found);
  }

  try {
    await updateDoc(doc(db, "orders", orderId), updateFields);
  } catch (e) {
    console.warn("Firestore manualConfirmDelivery notice:", e);
  }
  return { success: true };
}

/**
 * 6. Provider-Only Manpower & Crew Tracking Engine (Backend Simulation)
 */

export const INITIAL_MANPOWER_CREW = [
  {
    id: "crew-101",
    name: "Marcus Vance",
    role: "Lead Decoration Artisan & Stager",
    avatarBg: "linear-gradient(135deg, #10b981, #047857)",
    avatarInitials: "MV",
    status: "on_site", // 'available', 'dispatched', 'on_site', 'on_break'
    currentJobId: "LH-5821",
    location: "Oakridge Gardens (Zone A)",
    assignedVehicle: "LocalHub Sprinter Van #02",
    vehicleCharge: 88,
    skills: ["Wall Staging", "Laser Mount", "Ambient Lighting"],
    completedJobsToday: 3,
    activeSince: "07:30 AM",
    safetyRating: 5.0
  },
  {
    id: "crew-102",
    name: "Elena Rostova",
    role: "Master Electrical & Structural Installer",
    avatarBg: "linear-gradient(135deg, #6366f1, #4338ca)",
    avatarInitials: "ER",
    status: "available",
    currentJobId: null,
    location: "Central Depot Standby",
    assignedVehicle: "Service EV Crossover #07",
    vehicleCharge: 95,
    skills: ["Floating Shelves", "Circuit Rigging", "Heavy Fixtures"],
    completedJobsToday: 2,
    activeSince: "08:00 AM",
    safetyRating: 4.9
  },
  {
    id: "crew-103",
    name: "Darius Miller",
    role: "Senior Sanitation & Deep Steam Specialist",
    avatarBg: "linear-gradient(135deg, #0ea5e9, #0284c7)",
    avatarInitials: "DM",
    status: "dispatched",
    currentJobId: "LH-9410",
    location: "En Route to Greenwood District",
    assignedVehicle: "High-Pressure Hydro Van #01",
    vehicleCharge: 74,
    skills: ["Hospital-Grade Sanitization", "Carpet Extraction", "Tile Descaling"],
    completedJobsToday: 4,
    activeSince: "06:45 AM",
    safetyRating: 5.0
  },
  {
    id: "crew-104",
    name: "Siddharth Rao",
    role: "Fleet Logistics & Vehicle Deliveryman",
    avatarBg: "linear-gradient(135deg, #f59e0b, #d97706)",
    avatarInitials: "SR",
    status: "on_site",
    currentJobId: "LH-3342",
    location: "Silverwood Heights",
    assignedVehicle: "Tesla Model 3 Flatbed Transporter",
    vehicleCharge: 91,
    skills: ["Contactless Unlock Handover", "Fleet Dispatch", "Rapid Delivery"],
    completedJobsToday: 5,
    activeSince: "08:15 AM",
    safetyRating: 4.9
  },
  {
    id: "crew-105",
    name: "Chloe Jenkins",
    role: "Decor Supplies Inventory & Prep Tech",
    avatarBg: "linear-gradient(135deg, #ec4899, #be185d)",
    avatarInitials: "CJ",
    status: "available",
    currentJobId: null,
    location: "Depot Warehouse Hub",
    assignedVehicle: "Supply Courier Runner #09",
    vehicleCharge: 100,
    skills: ["Material Packaging", "Garland Fabrication", "Fairy Light QA"],
    completedJobsToday: 6,
    activeSince: "09:00 AM",
    safetyRating: 5.0
  }
];

export function getProviderManpowerRoster() {
  try {
    const saved = localStorage.getItem("lh_provider_manpower");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  localStorage.setItem("lh_provider_manpower", safeJsonStringify(INITIAL_MANPOWER_CREW));
  return INITIAL_MANPOWER_CREW;
}

export function updateCrewMemberStatus(crewId, newStatus, currentJobId = null) {
  const roster = getProviderManpowerRoster();
  const member = roster.find(m => m.id === crewId);
  if (member) {
    member.status = newStatus;
    if (currentJobId !== undefined) member.currentJobId = currentJobId;
    localStorage.setItem("lh_provider_manpower", safeJsonStringify(roster));
  }
  return roster;
}

export function simulateOperationsTick() {
  const roster = getProviderManpowerRoster();
  if (!roster || roster.length === 0) return roster;

  const randomIndex = Math.floor(Math.random() * roster.length);
  const target = roster[randomIndex];

  const possibleStatuses = ["available", "dispatched", "on_site", "on_break"];
  const nextStatus = possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)];
  
  target.status = nextStatus;
  target.vehicleCharge = Math.max(20, Math.min(100, target.vehicleCharge + (Math.random() > 0.5 ? -2 : 3)));
  
  if (nextStatus === "on_site") {
    target.location = "Neighborhood Site (" + (["Zone A", "Zone B", "West Valley", "Greenwood", "Heights"][Math.floor(Math.random() * 5)]) + ")";
  } else if (nextStatus === "dispatched") {
    target.location = "Transit on Expressway Corridor";
  } else if (nextStatus === "available") {
    target.location = "Standby at Operations Base";
    target.currentJobId = null;
  }

  localStorage.setItem("lh_provider_manpower", safeJsonStringify(roster));
  return { roster, updatedMember: target, message: `Crew Member ${target.name} is now ${nextStatus.toUpperCase().replace('_', ' ')} (${target.location})` };
}

/**
 * 7. Provider Decor Staging & Shift Schedule System (Available 24/7 all the time)
 */

export const INITIAL_DECOR_SCHEDULE = [
  {
    id: "sch-1",
    title: "Floral Archway & Backdrop Staging",
    category: "Home & Venue Decor",
    date: new Date().toISOString().split("T")[0],
    timeSlot: "09:00 AM - 12:30 PM",
    slotType: "morning",
    location: "Meadowland Pavilion (Zone A)",
    assignedCrewId: "crew-101",
    assignedCrewName: "Marcus Vance",
    status: "in_progress",
    notes: "Requires 6x Botanical Garland vines, warm fairy lights, and heavy-duty anchors."
  },
  {
    id: "sch-2",
    title: "Ambient Fairy Lights & Canopy Rigging",
    category: "Lighting Rigging",
    date: new Date().toISOString().split("T")[0],
    timeSlot: "02:00 PM - 05:30 PM",
    slotType: "afternoon",
    location: "Grand Terrace Ballroom B",
    assignedCrewId: "crew-102",
    assignedCrewName: "Elena Rostova",
    status: "scheduled",
    notes: "Ceiling grid mounting with 50m micro-LED strings and dual wireless dimmers."
  },
  {
    id: "sch-3",
    title: "VIP Gala Velvet Drapery & Balloon Arches",
    category: "Banquet Staging",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    timeSlot: "06:00 PM - 09:30 PM",
    slotType: "evening",
    location: "Riverside Event Hall",
    assignedCrewId: "crew-105",
    assignedCrewName: "Chloe Jenkins",
    status: "scheduled",
    notes: "Stage backdrop with royal purple velvet drapes and metallic chrome balloon clusters."
  }
];

export function getDecorSchedule() {
  try {
    const saved = localStorage.getItem("lh_decor_schedule");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  localStorage.setItem("lh_decor_schedule", safeJsonStringify(INITIAL_DECOR_SCHEDULE));
  return INITIAL_DECOR_SCHEDULE;
}

export function saveDecorScheduleItem(item) {
  const schedule = getDecorSchedule();
  const newItem = {
    id: item.id || "sch-" + Date.now(),
    title: item.title,
    category: item.category || "Home Decor",
    date: item.date || new Date().toISOString().split("T")[0],
    timeSlot: item.timeSlot || "09:00 AM - 12:00 PM",
    slotType: item.slotType || "morning",
    location: item.location || "Local Customer Address / Venue",
    assignedCrewId: item.assignedCrewId || "crew-101",
    assignedCrewName: item.assignedCrewName || "Marcus Vance",
    status: item.status || "scheduled",
    notes: item.notes || "",
    createdAt: new Date().toISOString()
  };
  const index = schedule.findIndex(s => s.id === newItem.id);
  if (index >= 0) {
    schedule[index] = { ...schedule[index], ...newItem };
  } else {
    schedule.unshift(newItem);
  }
  localStorage.setItem("lh_decor_schedule", safeJsonStringify(schedule));
  return schedule;
}

export function deleteDecorScheduleItem(id) {
  const schedule = getDecorSchedule().filter(s => s.id !== id);
  localStorage.setItem("lh_decor_schedule", safeJsonStringify(schedule));
  return schedule;
}

export function updateDecorScheduleStatus(id, newStatus) {
  const schedule = getDecorSchedule();
  const item = schedule.find(s => s.id === id);
  if (item) {
    item.status = newStatus;
    localStorage.setItem("lh_decor_schedule", safeJsonStringify(schedule));
  }
  return schedule;
}

/**
 * 8. Live Website Landing Page Reviews System (Customer Feedback for the Website/Platform)
 */

export const INITIAL_WEBSITE_REVIEWS = [
  {
    id: "webrev-1",
    authorName: "Margaret Hayes",
    location: "Greenwood District",
    rating: 5,
    text: "The deep home cleaning booking was pristine! The sweeper arrived on time and sanitized the entire house with eco-friendly sanitizers. Absolute lifesaver platform.",
    tag: "Verified Resident",
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    id: "webrev-2",
    authorName: "Terrance Logan",
    location: "Silverwood Heights",
    rating: 5,
    text: "Renting the Tesla Model 3 was seamless. Dynamic booking state updates kept me informed when the car was ready. Best vehicle marketplace experience I've had in years!",
    tag: "Fleet Renter",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: "webrev-3",
    authorName: "Rachel Kim",
    location: "Oakridge Gardens",
    rating: 5,
    text: "The floating shelves installation was robust and flawless. The decorator tested the plaster wall strength and mounted them cleanly in under an hour. Highly recommend LocalHub!",
    tag: "Homeowner",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

const websiteReviewListeners = new Set();
let websiteReviewsBroadcast = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    websiteReviewsBroadcast = new BroadcastChannel("lh_website_reviews_bus");
    websiteReviewsBroadcast.onmessage = () => {
      notifyWebsiteReviewListeners();
    };
  }
} catch (e) {}

function notifyWebsiteReviewListeners() {
  const reviews = getWebsiteReviews();
  websiteReviewListeners.forEach(cb => {
    try {
      cb(reviews);
    } catch (err) {
      console.warn("Website review listener error:", err);
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("lh_website_reviews_changed", () => {
    notifyWebsiteReviewListeners();
  });
}

export function getWebsiteReviews() {
  try {
    const saved = localStorage.getItem("lh_website_reviews");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  localStorage.setItem("lh_website_reviews", safeJsonStringify(INITIAL_WEBSITE_REVIEWS));
  return INITIAL_WEBSITE_REVIEWS;
}

export async function submitWebsiteReview({ rating, text, authorName, customerId, location, tag }) {
  const currentReviews = getWebsiteReviews();
  const newReview = {
    id: "webrev-" + Date.now(),
    authorName: authorName || "Verified Local Resident",
    location: location || "Local Community",
    rating: Number(rating) || 5,
    text: text || "Great hyperlocal marketplace experience!",
    tag: tag || "Verified Customer",
    customerId: customerId || "cust-guest",
    createdAt: new Date().toISOString()
  };

  const cleanReview = sanitizeForStorage(newReview);
  currentReviews.unshift(cleanReview);
  localStorage.setItem("lh_website_reviews", safeJsonStringify(currentReviews));

  // Save to Firestore if available
  if (db) {
    try {
      await addDoc(collection(db, "websiteReviews"), cleanReview);
    } catch (e) {
      console.warn("Firestore website review write fallback to local storage:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("lh_website_reviews_changed", { detail: { id: cleanReview.id } }));
    } catch (e) {}
  }
  if (websiteReviewsBroadcast) {
    try {
      websiteReviewsBroadcast.postMessage({ type: "NEW_WEBSITE_REVIEW", payload: { id: cleanReview.id } });
    } catch (e) {}
  }

  notifyWebsiteReviewListeners();
  return { success: true, review: cleanReview };
}

export function listenToWebsiteReviews(callback) {
  websiteReviewListeners.add(callback);
  // Send current immediately
  callback(getWebsiteReviews());

  return () => {
    websiteReviewListeners.delete(callback);
  };
}

