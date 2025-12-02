import { create } from "zustand";

/* -----------------------------------------------------------
   USER
----------------------------------------------------------- */
interface PuterUser {
  uid: string;
  username: string;
  email?: string;
}

/* -----------------------------------------------------------
   FS
----------------------------------------------------------- */
export interface FSItem {
  name: string;
  path: string;
  is_dir: boolean;
  parent_uid: string;
  created?: number;
  modified?: number;
}

/* -----------------------------------------------------------
   KV
----------------------------------------------------------- */
interface KVItem {
  key: string;
  value: string;
}

/* -----------------------------------------------------------
   AI RESPONSE FORMAT (IMPORTANT)
----------------------------------------------------------- */
export interface AIResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

/* Chat message */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | any;
}

export interface PuterChatOptions {
  model?: string;
}

/* -----------------------------------------------------------
   FEEDBACK TYPE (Your app's structure)
----------------------------------------------------------- */
export interface Feedback {
  overallScore: number;

  toneAndStyle: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };

  content: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };

  structure: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };

  skills: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };

  ATS: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
    }[];
  };
}

/* -----------------------------------------------------------
   GLOBAL PUTER DECLARATION
----------------------------------------------------------- */
declare global {
  interface Window {
    puter: {
      auth: {
        getUser: () => Promise<PuterUser>;
        isSignedIn: () => Promise<boolean>;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
      };
      fs: {
        write: (path: string, data: string | File | Blob) => Promise<File | undefined>;
        read: (path: string) => Promise<Blob>;
        upload: (file: File[] | Blob[]) => Promise<FSItem>;
        delete: (path: string) => Promise<void>;
        readdir: (path: string) => Promise<FSItem[] | undefined>;
      };
      ai: {
        chat: (
          prompt: string | ChatMessage[],
          options?: PuterChatOptions
        ) => Promise<AIResponse>;
        img2txt: (image: string | File | Blob, testMode?: boolean) => Promise<string>;
      };
      kv: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        list: (pattern: string, returnValues?: boolean) => Promise<string[]>;
        flush: () => Promise<boolean>;
      };
    };
  }
}

/* -----------------------------------------------------------
   ZUSTAND STORE
----------------------------------------------------------- */
interface PuterStore {
  isLoading: boolean;
  error: string | null;
  puterReady: boolean;

  auth: {
    user: PuterUser | null;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    checkAuthStatus: () => Promise<boolean>;
    getUser: () => PuterUser | null;
  };

  fs: {
    write: (path: string, data: string | File | Blob) => Promise<File | undefined>;
    read: (path: string) => Promise<Blob | undefined>;
    upload: (file: File[] | Blob[]) => Promise<FSItem | undefined>;
    delete: (path: string) => Promise<void>;
    readDir: (path: string) => Promise<FSItem[] | undefined>;
  };

  ai: {
    chat: (
      prompt: string | ChatMessage[],
      options?: PuterChatOptions
    ) => Promise<AIResponse | undefined>;
    feedback: (path: string, message: string) => Promise<AIResponse | undefined>;
    img2txt: (image: string | File | Blob, testMode?: boolean) =>
      Promise<string | undefined>;
  };

  kv: {
    get: (key: string) => Promise<string | null | undefined>;
    set: (key: string, value: string) => Promise<boolean | undefined>;
    delete: (key: string) => Promise<boolean | undefined>;
    list: (pattern: string, returnValues?: boolean) => Promise<string[]>;
    flush: () => Promise<boolean | undefined>;
  };

  init: () => void;
  clearError: () => void;
}

const getPuter = () =>
  typeof window !== "undefined" ? window.puter : null;

/* -----------------------------------------------------------
   STORE IMPLEMENTATION
----------------------------------------------------------- */
export const usePuterStore = create<PuterStore>((set, get) => {
  const setError = (msg: string) => {
    set({
      error: msg,
      isLoading: false,
      auth: {
        user: null,
        isAuthenticated: false,
        signIn: get().auth.signIn,
        signOut: get().auth.signOut,
        refreshUser: get().auth.refreshUser,
        checkAuthStatus: get().auth.checkAuthStatus,
        getUser: get().auth.getUser,
      },
    });
  };

  /* -----------------------------------------------------------
      AUTH STATUS
  ----------------------------------------------------------- */
  const checkAuthStatus = async (): Promise<boolean> => {
    const puter = getPuter();
    if (!puter) return false;

    try {
      const signed = await puter.auth.isSignedIn();
      if (signed) {
        const user = await puter.auth.getUser();
        set({
          auth: {
            user,
            isAuthenticated: true,
            signIn: get().auth.signIn,
            signOut: get().auth.signOut,
            refreshUser: get().auth.refreshUser,
            checkAuthStatus,
            getUser: () => user,
          },
        });
        return true;
      }

      set({
        auth: {
          user: null,
          isAuthenticated: false,
          signIn: get().auth.signIn,
          signOut: get().auth.signOut,
          refreshUser: get().auth.refreshUser,
          checkAuthStatus,
          getUser: () => null,
        },
      });

      return false;
    } catch (err) {
      return false;
    }
  };

  /* -----------------------------------------------------------
      SIGN IN
  ----------------------------------------------------------- */
  const signIn = async () => {
    const puter = getPuter();
    if (!puter) return;

    try {
      await puter.auth.signIn();
      await checkAuthStatus();
    } catch (err) {
      setError("Sign in failed");
    }
  };

  /* -----------------------------------------------------------
      FEEDBACK VIA FILE + TEXT
  ----------------------------------------------------------- */
  const feedback = async (path: string, message: string) => {
    const puter = getPuter();
    if (!puter) return;

    try {
      const resp = await puter.ai.chat(
        [
          {
            role: "user",
            content: [
              { type: "file", puter_path: path },
              { type: "text", text: message },
            ],
          },
        ],
        { model: "claude-3.5-sonnet" }
      );

      return resp as AIResponse;
    } catch (err: any) {
      console.error("AI Feedback Error:", err);
      return undefined;
    }
  };

  /* -----------------------------------------------------------
      RETURN STORE
  ----------------------------------------------------------- */
  return {
    isLoading: true,
    error: null,
    puterReady: false,

    /* AUTH */
    auth: {
      user: null,
      isAuthenticated: false,
      signIn,
      signOut: async () => {},
      refreshUser: async () => {},
      checkAuthStatus,
      getUser: () => get().auth.user,
    },

    /* FILESYSTEM */
    fs: {
      write: async () => undefined,
      read: async () => undefined,
      readDir: async () => undefined,
      upload: async () => undefined,
      delete: async () => {},
    },

    /* AI */
    ai: {
      chat: async (
    prompt: string | ChatMessage[],
    options?: PuterChatOptions
): Promise<AIResponse | undefined> => {
    const puter = getPuter();
    if (!puter) return undefined;

    try {
        // EXPLICIT TYPE to fix red underline
        let payload: ChatMessage[];

        // If prompt is just a string → convert into structured ChatMessage
        if (typeof prompt === "string") {
            payload = [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ];
        } else {
            // Already ChatMessage[]
            payload = prompt;
        }

        // Call Puter AI correctly
        const response = await puter.ai.chat(
            payload,
            {
                model: options?.model || "claude-3.5-sonnet"
            }
        );
        console.log(">>> Puter AI Request Payload:", payload);
        console.log(">>> Puter AI Model:", options?.model || "claude-3.5-sonnet");
        console.log(">>> Puter AI Response:", response);


        return response as AIResponse;

    } catch (err) {
        console.error("AI Chat Error:", err);
        return undefined;
    }
},



      feedback: (path: string, message: string) =>
        feedback(path, message),

      img2txt: async (image: any, testMode?: boolean) => {
        const result = await getPuter()?.ai.img2txt(image, testMode);
        return result;
      },
    },

    /* KV STORE */
    kv: {
      get: async (key: string) => await getPuter()?.kv.get(key),
      set: async (key: string, value: string) =>
        await getPuter()?.kv.set(key, value),
      delete: async (key: string) =>
        await getPuter()?.kv.delete(key),
      list: async (p: string) =>
        (await getPuter()?.kv.list(p)) || [],
      flush: async () => await getPuter()?.kv.flush(),
    },

    /* INIT */
    init: () => {
      const puter = getPuter();
      if (!puter) return;

      set({
        puterReady: true,
        fs: {
          write: async (path, data) =>
            await puter.fs.write(path, data),
          read: async (path) =>
            await puter.fs.read(path),
          upload: async (files) =>
            await puter.fs.upload(files),
          delete: async (path) =>
            await puter.fs.delete(path),
          readDir: async (path) =>
            await puter.fs.readdir(path),
        },
      });

      checkAuthStatus();
    },

    clearError: () => set({ error: null }),
  };
});
