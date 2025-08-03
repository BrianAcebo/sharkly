# API Documentation

This directory contains the API layer for the application, providing a clean interface for data operations.

## Usage

```typescript
import { getLeads, createLead, updateLead, deleteLead } from '../api/leads';

// Get all leads
const response = await getLeads({
  search: 'john',
  status: 'active',
  priority: 'high'
});

// Create a lead
const newLead = await createLead({
  name: 'Jane Doe',
  email: 'jane@example.com',
  stage: 'new',
  priority: 'medium'
});
```

## API Methods

### Leads API

#### `getLeads(filters?, page?, perPage?, organizationId?)`
Fetches leads with optional filtering, sorting, and pagination.

**Parameters:**
- `filters` (optional): `LeadsFilters` object
- `page` (optional): Page number (default: 1)
- `perPage` (optional): Items per page (default: 10)
- `organizationId` (optional): Organization ID to filter by

**Returns:** `Promise<LeadsResponse>`

#### `getLead(id)`
Fetches a single lead by ID.

**Parameters:**
- `id`: Lead ID

**Returns:** `Promise<Lead>`

#### `createLead(leadData)`
Creates a new lead.

**Parameters:**
- `leadData`: `CreateLeadData` object

**Returns:** `Promise<Lead>`

#### `updateLead(id, leadData)`
Updates an existing lead.

**Parameters:**
- `id`: Lead ID
- `leadData`: `UpdateLeadData` object

**Returns:** `Promise<Lead>`

#### `deleteLead(id)`
Deletes a lead.

**Parameters:**
- `id`: Lead ID

**Returns:** `Promise<void>`

#### `getLeadStats(organizationId?)`
Gets lead statistics.

**Parameters:**
- `organizationId` (optional): Organization ID to filter by

**Returns:** `Promise<LeadStats>`

## Filtering Options

### LeadsFilters Interface

```typescript
interface LeadsFilters {
  search?: string;                    // Search in name, email, company, phone
  status?: 'active' | 'in_progress' | 'closed' | 'all';
  priority?: 'low' | 'medium' | 'high' | 'critical' | 'all';
  stage?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed-won' | 'closed-lost' | 'all';
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  sortBy?: 'created_at' | 'name' | 'priority' | 'value';
  sortOrder?: 'asc' | 'desc';
}
```

## Error Handling

All API methods use the `parseSupabaseError` utility to provide consistent error handling:

```typescript
try {
  const leads = await getLeads();
} catch (error) {
  // Error is already parsed and includes user-friendly messages
  console.error('API Error:', error.message);
}
```

## Examples

### Basic Usage

```typescript
// Get all leads for an organization
const leads = await getLeads({}, 1, 50, 'org-123');

// Search for leads
const response = await getLeads({ status: 'active' });
```

### Advanced Filtering

```typescript
const response = await getLeads({
  search: 'john',
  status: 'active',
  priority: 'high',
  stage: 'qualified',
  dateRange: {
    from: new Date('2024-01-01'),
    to: new Date('2024-12-31')
  },
  sortBy: 'created_at',
  sortOrder: 'desc'
}, 1, 20, 'org-123');
``` 