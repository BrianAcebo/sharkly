export interface AddressRecord {
    street_1?: string | null;
    street_2?: string | null;
    city?: string | null;
    region?: string | null; // state/province
    postal_code?: string | null;
    country?: string | null;
    geo?: { lat?: number; lon?: number } | null;
}


