import { useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function LogoutPage() {
	const handleSignOut = async () => {
        try {
          await supabase.auth.signOut();
          window.location.href = '/';
        } catch (error) {
          console.error('Error signing out:', error);
        }
    };

    useEffect(() => {
        handleSignOut();
    }, []);

    return <></>;
}