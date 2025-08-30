import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { UserProfile } from "../contexts/AuthContext";

// Auth debugging utilities - only active in development
export const authDebug = {
  log: (message: string, data?: any) => {
    // Silent in production
  },
  
  logUserState: (user: any) => {
    // Silent in production
  },
  
  logAuthChange: (event: string, session: any) => {
    // Silent in production
  }
}; 