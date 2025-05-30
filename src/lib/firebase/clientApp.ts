// src/lib/firebase/clientApp.ts
import { initializeApp, getApps, getApp, FirebaseApp} from 'firebase/app';

import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'; // Ensure this path is correct for your setup
import {
    getAI,
    getGenerativeModel,
    VertexAIBackend, // Using VertexAIBackend as per your last confirmation
    GenerativeModel as FirebaseAiGenerativeModel,
    FirebaseAIService
} from "firebase/ai";

console.log(
    "[clientApp.ts] Module Loading. NEXT_PUBLIC_FIREBASE_API_KEY:",
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    "Is this SSR?",
    typeof window === 'undefined'
);

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
    console.error("[clientApp.ts] CRITICAL ERROR: firebaseConfig.apiKey is UNDEFINED or EMPTY.");
} else {
    console.log("[clientApp.ts] firebaseConfig.apiKey (Firebase Web API Key) is set:", firebaseConfig.apiKey);
}

let app: FirebaseApp;
if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);
        console.log("[clientApp.ts] Firebase app INITIALIZED. App options API Key:", app.options.apiKey);
    } catch (error) {
        console.error("[clientApp.ts] Firebase app INITIALIZATION FAILED:", error);
        throw error;
    }
} else {
    app = getApp();
    console.log("[clientApp.ts] Firebase app REUSED. App options API Key:", app.options.apiKey);
}

const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);

// --- AI Service Initialization ---
const aiServiceCache = {
    instance: null as FirebaseAIService | null,
    promise: null as Promise<FirebaseAIService> | null,
};

function getInitializedAiService(): Promise<FirebaseAIService> {
    if (aiServiceCache.instance) {
        console.log("[clientApp.ts] Returning existing AI Service instance.");
        return Promise.resolve(aiServiceCache.instance);
    }
    if (aiServiceCache.promise) {
        console.log("[clientApp.ts] AI Service initialization already in progress. Returning existing promise.");
        return aiServiceCache.promise;
    }

    console.log("[clientApp.ts] Attempting to initialize Firebase AI Logic service (getAI with VertexAIBackend)...");
    aiServiceCache.promise = new Promise((resolve, reject) => {
        try {
            if (!app) {
                console.error("[clientApp.ts] Firebase app is not initialized before getAI call.");
                throw new Error("Firebase app is not initialized before getAI call.");
            }
            const ai = getAI(app, { backend: new VertexAIBackend() });
            console.log("[clientApp.ts] Firebase AI Logic service (getAI) initialized successfully with VertexAIBackend.");
            aiServiceCache.instance = ai;
            // aiServiceCache.promise = null; // No, let the promise resolve, don't null it here
            resolve(ai);
        } catch (error) {
            console.error("[clientApp.ts] Error initializing Firebase AI Logic service (getAI with VertexAIBackend):", error);
            aiServiceCache.promise = null; // Reset promise on failure to allow retry
            reject(error);
        }
    });
    return aiServiceCache.promise;
}
// --- END AI Service Init ---


// --- Generative Model Initialization ---
const modelCache = {
    instance: null as FirebaseAiGenerativeModel | null,
    promise: null as Promise<FirebaseAiGenerativeModel> | null,
    // Store the name of the model that the current instance/promise is for
    // to handle requests for different model names correctly.
    currentModelName: null as string | null,
};

export async function getInitializedGenerativeModel(modelName: string = "gemini-2.0-flash-001"): Promise<FirebaseAiGenerativeModel> {
    console.log(`[clientApp.ts] getInitializedGenerativeModel called for model: "${modelName}".`);
    console.log(`[clientApp.ts] Cache state: instance for model "${modelCache.currentModelName}", promise ${modelCache.promise ? 'exists' : 'null'}`);

    if (!app) {
        console.error("[clientApp.ts] CRITICAL: Firebase app is not initialized for getInitializedGenerativeModel.");
        throw new Error("Firebase app is not initialized.");
    }
    if (!app.options.apiKey) {
        console.error("[clientApp.ts] CRITICAL ERROR: Firebase app (app.options.apiKey) is UNDEFINED or EMPTY for getInitializedGenerativeModel.");
        throw new Error("Firebase app is missing its Web API key in configuration.");
    }

    // If a valid instance exists for the requested model name, return it
    if (modelCache.instance && modelCache.currentModelName === modelName) {
        console.log(`[clientApp.ts] Returning existing GenerativeModel instance for "${modelName}".`);
        return Promise.resolve(modelCache.instance);
    }

    // If a promise exists for the requested model name, return it
    if (modelCache.promise && modelCache.currentModelName === modelName) {
        console.log(`[clientApp.ts] Initialization in progress for "${modelName}". Returning existing promise.`);
        return modelCache.promise;
    }

    // If instance/promise is for a different model, or no promise exists, we need to (re-)initialize.
    if ((modelCache.instance && modelCache.currentModelName !== modelName) || (modelCache.promise && modelCache.currentModelName !== modelName)) {
        console.log(`[clientApp.ts] Model name changed from "${modelCache.currentModelName}" to "${modelName}". Resetting model cache.`);
        modelCache.instance = null;
        modelCache.promise = null;
        modelCache.currentModelName = null;
    }

    console.log(`[clientApp.ts] Creating new promise to initialize model: "${modelName}".`);
    modelCache.currentModelName = modelName; // Set the name for the upcoming promise/instance
    modelCache.promise = (async () => {
        try {
            const ai = await getInitializedAiService();
            console.log(`[clientApp.ts] AI Service obtained. Initializing GenerativeModel: "${modelName}" with VertexAIBackend path.`);
            const model = getGenerativeModel(ai, { model: modelName });
            console.log(`[clientApp.ts] GenerativeModel ("${modelName}") successfully created.`);
            modelCache.instance = model;
            // After successful creation, the original promise has done its job.
            // Future calls for the same modelName will hit the instance check.
            // Calls for different modelNames will correctly re-initialize.
            return model;
        } catch (error) {
            console.error(`[clientApp.ts] Error creating GenerativeModel ("${modelName}"):`, error);
            // Reset cache for this specific modelName if initialization failed, to allow retry
            if (modelCache.currentModelName === modelName) {
                modelCache.promise = null;
                modelCache.instance = null; // Also clear instance if it somehow got partially set or for consistency
                modelCache.currentModelName = null;
            }
            throw error; // Rethrow to be caught by the caller
        }
    })();

    return modelCache.promise;
}
// --- END Generative Model Init ---

export { app, auth, firestore };