"use client";

// LocalStorage helper for user-provided Gemini API key
const LS_KEY = "looksharp_gemini_api_key";

export function getUserGeminiApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(LS_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function setUserGeminiApiKey(key: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (key && key.trim()) {
      window.localStorage.setItem(LS_KEY, key.trim());
    } else {
      window.localStorage.removeItem(LS_KEY);
    }
  } catch {}
}

export function hasUserGeminiApiKey(): boolean {
  return !!getUserGeminiApiKey();
}

