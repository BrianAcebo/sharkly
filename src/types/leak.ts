export interface PasteLeakRecord {
  leak: {
    id?: string | null;
    source: string; // pastebin/forum name
    content_snippet?: string | null;
    found_emails?: string[] | null;
    found_usernames?: string[] | null;
    found_password_hashes?: string[] | null;
    retrieved_at?: string | null;
    url?: string | null;
  };
}


