export interface PropertyRecord {
  id: string;
  organization_id: string;
  address_full: string | null;
  address_components: {
    street_number?: string | null;
    street_name?: string | null;
    unit?: string | null;
    city?: string | null;
    county?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
  geo: { lat?: number | null; lng?: number | null; geocode_confidence?: number | null } | null;
  parcel: { apn?: string | null; parcel_id?: string | null; jurisdiction?: string | null } | null;
  legal_description: string | null;
  characteristics: {
    property_type?: string | null;
    beds?: number | null;
    baths?: number | null;
    year_built?: number | null;
    living_area_sqft?: number | null;
    lot_size_sqft?: number | null;
    stories?: number | null;
    construction_type?: string | null;
    zoning?: string | null;
  } | null;
  valuation: {
    assessed_value?: number | null;
    land_value?: number | null;
    improvement_value?: number | null;
    last_assessment_year?: number | null;
    est_market_value?: number | null;
    est_confidence?: number | null;
  } | null;
  occupancy: { owner_occupied?: boolean | null; vacancy_signal?: boolean | null } | null;
  mail_address: Record<string, unknown> | null;
  owners_current?: string[] | null;
  owners_prior?: string[] | null;
  sale_history?: Array<{ sale_date?: string; price?: number; document_id?: string; grantor?: string; grantee?: string }> | null;
  mortgages?: Array<{ lender?: string; amount?: number; instrument?: string; recording_date?: string; document_id?: string }> | null;
  liens_judgments?: Array<{ type?: string; amount?: number; filing_date?: string; release_date?: string }> | null;
  utilities_signals?: Array<Record<string, unknown>> | null;
  images?: Array<{ source?: string; url?: string; captured_at?: string }>; 
  notes?: string | null;
  confidence?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
  provenance?: Array<Record<string, unknown>> | null;
  web_mentions?: Array<Record<string, unknown>> | null;
  created_at: string;
  updated_at: string;
}


