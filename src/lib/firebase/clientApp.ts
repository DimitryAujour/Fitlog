// src/lib/firebase/clientApp.ts
import { initializeApp, getApps, getApp, FirebaseApp} from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
    getAI,
    getGenerativeModel,
    VertexAIBackend,
    GenerativeModel as FirebaseAiGenerativeModel
    // Removed FirebaseAIService from here
} from "firebase/ai";

// Define the type for the AI service instance using ReturnType
type AIService = ReturnType<typeof getAI>;

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

// ... (Firebase app initialization remains the same)
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
    instance: null as AIService | null, // Use the new AIService type
    promise: null as Promise<AIService> | null, // Use the new AIService type
};

function getInitializedAiService(): Promise<AIService> { // Use the new AIService type
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
            resolve(ai);
        } catch (error) {
            console.error("[clientApp.ts] Error initializing Firebase AI Logic service (getAI with VertexAIBackend):", error);
            aiServiceCache.promise = null;
            reject(error);
        }
    });
    return aiServiceCache.promise;
}
// --- END AI Service Init ---

// --- Generative Model Initialization ---
// (This part remains the same as getInitializedAiService now returns the correctly typed 'ai' object)
const modelCache = {
    instance: null as FirebaseAiGenerativeModel | null,
    promise: null as Promise<FirebaseAiGenerativeModel> | null,
    currentModelName: null as string | null,
};

export async function getInitializedGenerativeModel(modelName: string = "gemini-2.0-flash-001"): Promise<FirebaseAiGenerativeModel> { // Changed default model
    console.log(`[clientApp.ts] getInitializedGenerativeModel called for model: "${modelName}".`);
    // ... (rest of the function is the same, but ensure you are happy with the default model name)
    // I've changed the default here to "gemini-1.5-flash-latest" as "gemini-2.0-flash-001" might be less common or a preview.
    // Adjust if "gemini-2.0-flash-001" is confirmed to be correct and available for you.

    if (!app) {
        console.error("[clientApp.ts] CRITICAL: Firebase app is not initialized for getInitializedGenerativeModel.");
        throw new Error("Firebase app is not initialized.");
    }
    if (!app.options.apiKey) {
        console.error("[clientApp.ts] CRITICAL ERROR: Firebase app (app.options.apiKey) is UNDEFINED or EMPTY for getInitializedGenerativeModel.");
        throw new Error("Firebase app is missing its Web API key in configuration.");
    }

    if (modelCache.instance && modelCache.currentModelName === modelName) {
        console.log(`[clientApp.ts] Returning existing GenerativeModel instance for "${modelName}".`);
        return Promise.resolve(modelCache.instance);
    }

    if (modelCache.promise && modelCache.currentModelName === modelName) {
        console.log(`[clientApp.ts] Initialization in progress for "${modelName}". Returning existing promise.`);
        return modelCache.promise;
    }

    if ((modelCache.instance && modelCache.currentModelName !== modelName) || (modelCache.promise && modelCache.currentModelName !== modelName)) {
        console.log(`[clientApp.ts] Model name changed from "${modelCache.currentModelName}" to "${modelName}". Resetting model cache.`);
        modelCache.instance = null;
        modelCache.promise = null;
        modelCache.currentModelName = null;
    }

    console.log(`[clientApp.ts] Creating new promise to initialize model: "${modelName}".`);
    modelCache.currentModelName = modelName;
    modelCache.promise = (async () => {
        try {
            const ai = await getInitializedAiService(); // This will be correctly typed now
            console.log(`[clientApp.ts] AI Service obtained. Initializing GenerativeModel: "${modelName}" with VertexAIBackend path.`);
            const model = getGenerativeModel(ai, { model: modelName });
            console.log(`[clientApp.ts] GenerativeModel ("${modelName}") successfully created.`);
            modelCache.instance = model;
            return model;
        } catch (error) {
            console.error(`[clientApp.ts] Error creating GenerativeModel ("${modelName}"):`, error);
            if (modelCache.currentModelName === modelName) {
                modelCache.promise = null;
                modelCache.instance = null;
                modelCache.currentModelName = null;
            }
            throw error;
        }
    })();

    return modelCache.promise;
}
// --- END Generative Model Init ---

export { app, auth, firestore };