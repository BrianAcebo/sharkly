import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Download, Upload, FileText, AlertCircle, CheckCircle, Filter, Mail, Loader2 } from 'lucide-react';
import { Lead, CreateLeadData } from '../../types/leads';
import { LeadsFilters } from '../../api/leads';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import FileDropzone from '../form/FileDropzone';
import { FILTER_OPTIONS, DATE_RANGES, LEAD_STAGES, LEAD_PRIORITIES, LEAD_STATUSES } from '../../utils/constants';

interface LeadsImportExportProps {
  onImportLeads: (leads: CreateLeadData[]) => Promise<void>;
  onExportLeads: () => Promise<Lead[]>;
  onEmailExport?: (email: string, filters: LeadsFilters) => Promise<void>;
  leads: Lead[];
}

interface ExportOptions {
  includeAllFields: boolean;
  selectedFields: string[];
  filterStage: string;
  filterPriority: string;
  filterStatus: string;
  dateRange: typeof DATE_RANGES[keyof typeof DATE_RANGES];
  customDateFrom?: string;
  customDateTo?: string;
}

const DEFAULT_EXPORT_FIELDS = [
  'name', 'email', 'phone', 'company', 'title', 'stage', 'priority', 'value', 'description', 'tags', 'created_at'
];

const ALL_EXPORT_FIELDS = [
  'name', 'email', 'phone', 'company', 'title', 'stage', 'priority', 'value', 'description', 'tags', 'notes', 
  'status', 'category', 'created_at', 'updated_at', 'last_contact', 'assigned_to', 'created_by'
];

export function LeadsImportExport({ onImportLeads, onExportLeads, onEmailExport, leads }: LeadsImportExportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importPreview, setImportPreview] = useState<CreateLeadData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showEmailExport, setShowEmailExport] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isEmailing, setIsEmailing] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeAllFields: true,
    selectedFields: DEFAULT_EXPORT_FIELDS,
    filterStage: 'all',
    filterPriority: 'all',
    filterStatus: 'all',
    dateRange: DATE_RANGES.ALL
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(25);
  const totalPreviewPages = Math.max(1, Math.ceil(importPreview.length / previewPageSize));
  const pagedPreview = importPreview.slice((previewPage - 1) * previewPageSize, previewPage * previewPageSize);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [showUploadingIndicator, setShowUploadingIndicator] = useState(false);
  const MIN_UPLOAD_VIS_MS = 800; // ensure spinner is visible briefly regardless of CSV size

  const getFieldValue = (lead: Lead, field: string): string => {
    switch (field) {
      case 'name':
        return lead.name || '';
      case 'email':
        return lead.email || '';
      case 'phone':
        return lead.phone || '';
      case 'company':
        return lead.company || '';
      case 'title':
        return lead.title || '';
      case 'stage':
        return lead.stage || '';
      case 'priority':
        return lead.priority || '';
      case 'value':
        return lead.value?.toString() || '';
      case 'description':
        return lead.notes || '';
      case 'tags':
        return lead.tags?.join(', ') || '';
      case 'notes':
        return lead.notes || '';
      case 'status':
        return lead.status || '';
      case 'category':
        return lead.category || '';
      case 'created_at':
        return new Date(lead.created_at).toISOString();
      case 'updated_at':
        return new Date(lead.updated_at).toISOString();
      case 'last_contact':
        return lead.last_contact ? new Date(lead.last_contact).toISOString() : '';
      case 'assigned_to':
        return lead.assigned_to?.profile?.first_name + ' ' + lead.assigned_to?.profile?.last_name || '';
      case 'created_by':
        return lead.created_by_user?.email || lead.created_by || '';
      default:
        return '';
    }
  };

  const getFieldHeader = (field: string): string => {
    const headers: Record<string, string> = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      title: 'Title',
      stage: 'Stage',
      priority: 'Priority',
      value: 'Value',
      description: 'Description',
      tags: 'Tags',
      notes: 'Notes',
      status: 'Status',
      category: 'Category',
      created_at: 'Created At',
      updated_at: 'Updated At',
      last_contact: 'Last Contact',
      assigned_to: 'Assigned To',
      created_by: 'Created By'
    };
    return headers[field] || field;
  };

  const filterLeadsForExport = (leads: Lead[]): Lead[] => {
    let filtered = [...leads];

    // Apply stage filter
    if (exportOptions.filterStage !== 'all') {
      filtered = filtered.filter(lead => lead.stage === exportOptions.filterStage);
    }

    // Apply priority filter
    if (exportOptions.filterPriority !== 'all') {
      filtered = filtered.filter(lead => lead.priority === exportOptions.filterPriority);
    }

    // Apply status filter
    if (exportOptions.filterStatus !== 'all') {
      filtered = filtered.filter(lead => lead.status === exportOptions.filterStatus);
    }

    // Apply date range filter
    if (exportOptions.dateRange !== DATE_RANGES.ALL) {
      const now = new Date();
      let cutoffDate: Date;

      switch (exportOptions.dateRange) {
        case DATE_RANGES.LAST_7_DAYS:
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case DATE_RANGES.LAST_30_DAYS:
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case DATE_RANGES.LAST_90_DAYS:
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case DATE_RANGES.CUSTOM:
          if (exportOptions.customDateFrom && exportOptions.customDateTo) {
            const fromDate = new Date(exportOptions.customDateFrom);
            const toDate = new Date(exportOptions.customDateTo);
            filtered = filtered.filter(lead => {
              const createdDate = new Date(lead.created_at);
              return createdDate >= fromDate && createdDate <= toDate;
            });
          }
          break;
      }

      if (exportOptions.dateRange !== DATE_RANGES.CUSTOM) {
        filtered = filtered.filter(lead => new Date(lead.created_at) >= cutoffDate);
      }
    }

    return filtered;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      console.log('Starting export with options:', exportOptions);
      const leadsData = await onExportLeads();
      
      // Apply filters
      const filteredLeads = filterLeadsForExport(leadsData);
      
      if (filteredLeads.length === 0) {
        toast.error('No leads match the selected filters');
        return;
      }

      console.log('Exporting filtered leads:', filteredLeads.length);
      
      // Determine which fields to export
      const fieldsToExport = exportOptions.includeAllFields 
        ? ALL_EXPORT_FIELDS 
        : exportOptions.selectedFields;

      // Create CSV headers
      const csvHeaders = fieldsToExport.map(field => getFieldHeader(field));

      // Create data array with headers as first row
      const csvData = [csvHeaders];
      
      // Add data rows
      filteredLeads.forEach(lead => {
        const row = fieldsToExport.map(field => {
          const value = getFieldValue(lead, field);
          return value || ''; // Ensure we always have a string value
        });
        csvData.push(row);
      });

      console.log('CSV data prepared:', csvData.length, 'rows');

      // Convert to CSV using the robust method
      const csvContent = convertToCsv(csvData);
      console.log('CSV content generated, length:', csvContent.length);

      // Add BOM for Excel compatibility
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;

      // Download the CSV
      const filename = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      downloadCsv(csvWithBOM, filename);

      toast.success(`Exported ${filteredLeads.length} leads successfully!`);
      setShowExportOptions(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export leads. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const convertToCsv = (data: string[][]) => {
    const rows = [];
    // Add headers (first row of data)
    rows.push(data[0].join(','));

    // Add data rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i].map(value => {
        // Enclose values containing commas or newlines in double quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`; // Escape existing double quotes
        }
        return value;
      });
      rows.push(row.join(','));
    }
    return rows.join('\n');
  };

  const downloadCsv = (csvString: string, filename: string) => {    
    try {
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        console.log('Opened CSV in new window/tab');
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        // Pop up was blocked, trying data URL approach
        const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvString);
        const dataLink = document.createElement("a");
        dataLink.href = dataUrl;
        dataLink.download = filename;
        dataLink.style.visibility = 'hidden';
        document.body.appendChild(dataLink);
        dataLink.click();
        document.body.removeChild(dataLink);
        console.log('Tried data URL method');
      }
    } catch (error) {
      console.error('Error in downloadCsv:', error);
      toast.error('Failed download csv. Please try again.');
    }
  };

  const handleQuickExport = async () => {
    setIsExporting(true);
    try {
      console.log('Starting quick export...');
      const leadsData = await onExportLeads();
      console.log('Leads data received:', leadsData.length, 'leads');
      
      if (!leadsData || leadsData.length === 0) {
        toast.error('No leads to export');
        return;
      }
      
      // Prepare data for CSV conversion
      const csvHeaders = DEFAULT_EXPORT_FIELDS.map(field => getFieldHeader(field));
      console.log('CSV headers:', csvHeaders);

      // Create data array with headers as first row
      const csvData = [csvHeaders];
      
      // Add data rows
      leadsData.forEach(lead => {
        const row = DEFAULT_EXPORT_FIELDS.map(field => {
          const value = getFieldValue(lead, field);
          return value || ''; // Ensure we always have a string value
        });
        csvData.push(row);
      });

      console.log('CSV data prepared:', csvData.length, 'rows');

      // Convert to CSV using the robust method
      const csvContent = convertToCsv(csvData);
      console.log('CSV content length:', csvContent.length);
      console.log('CSV content preview:', csvContent.substring(0, 200));

      // Add BOM for Excel compatibility
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;

      // Download the CSV
      const filename = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      console.log('handleQuickExport: About to call downloadCsv with filename:', filename);
      downloadCsv(csvWithBOM, filename);
      console.log('handleQuickExport: downloadCsv call completed');

      toast.success(`Exported ${leadsData.length} leads successfully!`);
    } catch (error) {
      console.error('Quick export error:', error);
      toast.error('Failed to export leads: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFieldToggle = (field: string) => {
    if (exportOptions.selectedFields.includes(field)) {
      setExportOptions(prev => ({
        ...prev,
        selectedFields: prev.selectedFields.filter(f => f !== field)
      }));
    } else {
      setExportOptions(prev => ({
        ...prev,
        selectedFields: [...prev.selectedFields, field]
      }));
    }
  };

  const handleAllFieldsToggle = (includeAll: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      includeAllFields: includeAll,
      selectedFields: includeAll ? ALL_EXPORT_FIELDS : DEFAULT_EXPORT_FIELDS
    }));
  };

  const handleEmailExport = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!onEmailExport) {
      toast.error('Email export is not available');
      return;
    }

    setIsEmailing(true);
    try {
      // Convert export options to API filters
      const filters: LeadsFilters = {};
      
      if (exportOptions.filterStage !== 'all') {
        filters.stage = exportOptions.filterStage as typeof LEAD_STAGES[keyof typeof LEAD_STAGES];
      }
      
      if (exportOptions.filterPriority !== 'all') {
        filters.priority = exportOptions.filterPriority as typeof LEAD_PRIORITIES[keyof typeof LEAD_PRIORITIES];
      }
      
      if (exportOptions.filterStatus !== 'all') {
        filters.status = exportOptions.filterStatus as typeof LEAD_STATUSES[keyof typeof LEAD_STATUSES];
      }
      
      if (exportOptions.dateRange !== DATE_RANGES.ALL) {
        const now = new Date();
        let fromDate: Date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
        
        switch (exportOptions.dateRange) {
          case DATE_RANGES.LAST_7_DAYS:
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case DATE_RANGES.LAST_30_DAYS:
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case DATE_RANGES.LAST_90_DAYS:
            fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case DATE_RANGES.CUSTOM:
            if (exportOptions.customDateFrom && exportOptions.customDateTo) {
              filters.dateRange = {
                from: new Date(exportOptions.customDateFrom),
                to: new Date(exportOptions.customDateTo)
              };
            }
            break;
          default:
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
            break;
        }
        
        if (exportOptions.dateRange !== DATE_RANGES.CUSTOM) {
          filters.dateRange = { from: fromDate };
        }
      }

      await onEmailExport(emailAddress, filters);
      toast.success(`Leads export sent to ${emailAddress}`);
      setShowEmailExport(false);
      setEmailAddress('');
    } catch (error) {
      console.error('Email export error:', error);
      toast.error('Failed to send email export');
    } finally {
      setIsEmailing(false);
    }
  };

  // Validate and process a CSV file
  const processCsvFile = (file: File) => {
    if (!file) return;
    const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      toast.error('Please upload a .csv file');
      return;
    }

    // Ensure the uploading indicator is visible while we parse, for at least 1s
    setShowUploadingIndicator(true);
    const parseStart = Date.now();

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = (e.target?.result as string) || '';
        if (!csvContent.trim()) {
          toast.error('CSV file is empty');
          const elapsed = Date.now() - parseStart;
          const remaining = Math.max(0, 1000 - elapsed);
          setTimeout(() => setShowUploadingIndicator(false), remaining);
          return;
        }

        // Parse CSV with proper handling of quoted fields
        const parseCSV = (csv: string): string[][] => {
          const lines = csv.split('\n');
          const result: string[][] = [];
          for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '');
            if (!line.trim()) continue;

            const fields: string[] = [];
            let currentField = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  currentField += '"';
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                fields.push(currentField.trim());
                currentField = '';
              } else {
                currentField += char;
              }
            }
            fields.push(currentField.trim());
            result.push(fields);
          }
          return result;
        };

        const parsed = parseCSV(csvContent);
        if (parsed.length < 2) {
          toast.error('CSV must include a header row and at least one data row');
          const elapsed = Date.now() - parseStart;
          const remaining = Math.max(0, 1000 - elapsed);
          setTimeout(() => setShowUploadingIndicator(false), remaining);
          return;
        }

        // Validate headers
        const headers = parsed[0].map(h => h.trim());
        const expectedHeaders = DEFAULT_EXPORT_FIELDS.map(field => getFieldHeader(field));
        // Allow either Description or Notes for the notes column
        const allowedHeaderSet = new Set<string>([...expectedHeaders, 'Notes']);

        // Required: first column must be Name, Email is optional but must be second column if present
        if (headers[0] !== 'Name') {
          toast.error('CSV must start with "Name" header');
          return;
        }
        if (headers[1] && headers[1] !== 'Email') {
          toast.error('Second column must be "Email" if present');
          return;
        }
        // All headers must be recognized
        for (const h of headers) {
          if (!allowedHeaderSet.has(h)) {
            toast.error(`Unrecognized header: ${h}`);
            return;
          }
        }

        // Build a column index map for robust parsing regardless of order
        const headerIndex = new Map<string, number>();
        headers.forEach((h, idx) => headerIndex.set(h, idx));

        const stageValues = new Set<string>(Object.values(LEAD_STAGES));
        const priorityValues = new Set<string>(Object.values(LEAD_PRIORITIES));

        const leadsToImport: CreateLeadData[] = [];
        for (let i = 1; i < parsed.length; i++) {
          const row = parsed[i];
          if (row.length === 0 || row.every(v => !v?.trim())) continue;

          const get = (label: string) => {
            const idx = headerIndex.get(label);
            return typeof idx === 'number' ? (row[idx] || '').trim() : '';
          };

          const name = get('Name');
          const email = get('Email');
          if (!name) {
            toast.error(`Row ${i + 1}: Name is required`);
            return;
          }

          const stage = get('Stage');
          if (stage && !stageValues.has(stage)) {
            toast.error(`Row ${i + 1}: Invalid Stage "${stage}"`);
            return;
          }

          const priority = get('Priority');
          if (priority && !priorityValues.has(priority)) {
            toast.error(`Row ${i + 1}: Invalid Priority "${priority}"`);
            return;
          }

          const valueRaw = get('Value');
          const value = valueRaw ? Number(valueRaw) : undefined;
          if (valueRaw && Number.isNaN(value)) {
            toast.error(`Row ${i + 1}: Value must be a number`);
            return;
          }

          const notes = get('Description') || get('Notes');
          const tagsRaw = get('Tags');
          const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

          const lead: CreateLeadData = {
            name,
            email,
            phone: get('Phone') || undefined,
            company: get('Company') || undefined,
            title: get('Title') || undefined,
            stage: (stage as 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed-won' | 'closed-lost') || 'new',
            priority: (priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
            value,
            notes: notes || undefined,
            tags
          };

          leadsToImport.push(lead);
        }

        setImportPreview(leadsToImport);
        setShowPreview(true);
      } catch (err) {
        console.error('CSV parse error:', err);
        toast.error('Failed to parse CSV');
      } finally {
        const elapsed = Date.now() - parseStart;
        const remaining = Math.max(0, 1000 - elapsed);
        setTimeout(() => setShowUploadingIndicator(false), remaining);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setShowUploadingIndicator(true);
    setImportProgress(0);
    const startVis = Date.now();
    try {
      const total = importPreview.length;
      
      // Import all leads in a single bulk operation
      await onImportLeads(importPreview);
      setImportProgress(100);
      
      setShowPreview(false);
      setImportPreview([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success(`Imported ${total} leads successfully!`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import leads');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      const elapsed = Date.now() - startVis;
      const remaining = Math.max(0, MIN_UPLOAD_VIS_MS - elapsed);
      setTimeout(() => setShowUploadingIndicator(false), remaining);
    }
  };

  const downloadTemplate = () => {
    try {
      const headers = DEFAULT_EXPORT_FIELDS.map(field => getFieldHeader(field));
      const csvContent = convertToCsv([headers]);
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      console.log('Template CSV prepared. Length:', csvWithBOM.length);
      downloadCsv(csvWithBOM, 'lead_import_template.csv');
      toast.success('Template downloaded');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  // Build summary items for non-default export settings (filters and fields)
  type ExportSummaryItem = { key: 'stage' | 'priority' | 'status' | 'date' | 'field'; label: string; fieldId?: string };
  const getExportSummaryItems = (): ExportSummaryItem[] => {
    const items: ExportSummaryItem[] = [];
    if (exportOptions.filterStage !== 'all') items.push({ key: 'stage', label: `Stage: ${exportOptions.filterStage}` });
    if (exportOptions.filterPriority !== 'all') items.push({ key: 'priority', label: `Priority: ${exportOptions.filterPriority}` });
    if (exportOptions.filterStatus !== 'all') items.push({ key: 'status', label: `Status: ${exportOptions.filterStatus}` });

    if (exportOptions.dateRange === DATE_RANGES.CUSTOM && exportOptions.customDateFrom && exportOptions.customDateTo) {
      items.push({ key: 'date', label: `Date: ${new Date(exportOptions.customDateFrom).toLocaleDateString()} - ${new Date(exportOptions.customDateTo).toLocaleDateString()}` });
    } else if (exportOptions.dateRange !== DATE_RANGES.ALL) {
      const map: Record<string, string> = {
        [DATE_RANGES.LAST_7_DAYS]: 'Last 7 days',
        [DATE_RANGES.LAST_30_DAYS]: 'Last 30 days',
        [DATE_RANGES.LAST_90_DAYS]: 'Last 90 days',
        [DATE_RANGES.CUSTOM]: 'Custom'
      } as const;
      items.push({ key: 'date', label: `Date: ${map[exportOptions.dateRange]}` });
    }

    if (!exportOptions.includeAllFields) {
      exportOptions.selectedFields.forEach(f => {
        items.push({ key: 'field', label: getFieldHeader(f), fieldId: f });
      });
    }
    return items;
  };

  const clearExportFilter = (key: 'stage' | 'priority' | 'status' | 'date') => {
    setExportOptions(prev => {
      if (key === 'stage') return { ...prev, filterStage: 'all' };
      if (key === 'priority') return { ...prev, filterPriority: 'all' };
      if (key === 'status') return { ...prev, filterStatus: 'all' };
      // date
      return { ...prev, dateRange: DATE_RANGES.ALL, customDateFrom: undefined, customDateTo: undefined };
    });
  };

  const clearExportField = (fieldId: string) => {
    setExportOptions(prev => ({ ...prev, selectedFields: prev.selectedFields.filter(f => f !== fieldId) }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Leads
            </CardTitle>
            <CardDescription>
              Export leads to a CSV file with customizable options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total leads: <span className="font-medium">{leads.length}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Quick export includes: Name, Email, Phone, Company, Title, Stage, Priority, Value, Notes, Tags, Created Date
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap mt-2">
                <Button 
                  onClick={handleQuickExport} 
                  disabled={isExporting || leads.length === 0}
                  className="flex items-center gap-2 flex-1"
                >
                  {isExporting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isExporting ? 'Exporting...' : 'Quick Export'}
                </Button>
                
                <Dialog open={showExportOptions} onOpenChange={setShowExportOptions}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 flex-1">
                      <Filter className="h-4 w-4" />
                      Advanced Export
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Export Options</DialogTitle>
                      <DialogDescription>
                        Customize your export with filters and field selection
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Field Selection */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Export Fields</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="include-all-fields"
                            checked={exportOptions.includeAllFields}
                            onCheckedChange={handleAllFieldsToggle}
                          />
                          <Label htmlFor="include-all-fields" className="text-sm">
                            Include all fields
                          </Label>
                        </div>
                        
                        {!exportOptions.includeAllFields && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            {ALL_EXPORT_FIELDS.map(field => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`field-${field}`}
                                  checked={exportOptions.selectedFields.includes(field)}
                                  onCheckedChange={() => handleFieldToggle(field)}
                                />
                                <Label htmlFor={`field-${field}`} className="text-sm">
                                  {getFieldHeader(field)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Stage Filter</Label>
                          <Select
                            value={exportOptions.filterStage}
                            onValueChange={(value) => setExportOptions(prev => ({ ...prev, filterStage: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FILTER_OPTIONS.STAGE.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Priority Filter</Label>
                          <Select
                            value={exportOptions.filterPriority}
                            onValueChange={(value) => setExportOptions(prev => ({ ...prev, filterPriority: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FILTER_OPTIONS.PRIORITY.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Status Filter</Label>
                          <Select
                            value={exportOptions.filterStatus}
                            onValueChange={(value) => setExportOptions(prev => ({ ...prev, filterStatus: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FILTER_OPTIONS.STATUS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Date Range</Label>
                          <Select
                            value={exportOptions.dateRange}
                            onValueChange={(value) => setExportOptions(prev => ({ ...prev, dateRange: value as typeof DATE_RANGES[keyof typeof DATE_RANGES] }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FILTER_OPTIONS.DATE_RANGE.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {exportOptions.dateRange === DATE_RANGES.CUSTOM && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">From Date</Label>
                            <input
                              type="date"
                              value={exportOptions.customDateFrom || ''}
                              onChange={(e) => setExportOptions(prev => ({ ...prev, customDateFrom: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">To Date</Label>
                            <input
                              type="date"
                              value={exportOptions.customDateTo || ''}
                              onChange={(e) => setExportOptions(prev => ({ ...prev, customDateTo: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {getExportSummaryItems().length > 0 && (
                      <div className="mt-2">
                        <Label className="text-sm font-medium">Selected Filters & Fields</Label>
                        <div className="max-h-24 overflow-y-auto pr-1">
                          <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {getExportSummaryItems().map((item, i) => (
                              <Badge key={`dlg-summary-${i}`} variant="secondary" className="inline-flex items-center gap-1">
                                {item.label}
                                {item.key === 'field' ? (
                                  <button
                                    type="button"
                                    className="ml-1 text-gray-400 hover:text-gray-600"
                                    onClick={() => clearExportField(item.fieldId!)}
                                    aria-label={`Remove field ${item.label}`}
                                  >
                                    ×
                                  </button>
                                ) : ((item.key === 'date' && (exportOptions.dateRange !== DATE_RANGES.ALL)) ||
                                  (item.key === 'stage' && exportOptions.filterStage !== 'all') ||
                                  (item.key === 'priority' && exportOptions.filterPriority !== 'all') ||
                                  (item.key === 'status' && exportOptions.filterStatus !== 'all')) ? (
                                  <button
                                    type="button"
                                    className="ml-1 text-gray-400 hover:text-gray-600"
                                    onClick={() => clearExportFilter(item.key as 'stage' | 'priority' | 'status' | 'date')}
                                    aria-label={`Clear ${item.key} filter`}
                                  >
                                    ×
                                  </button>
                                ) : null}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowExportOptions(false)}
                        className="flex-1 sm:flex-none"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setShowExportOptions(false)}
                        className="flex-1 sm:flex-none"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 flex-1 sm:flex-none"
                      >
                        {isExporting ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {isExporting ? 'Exporting...' : 'Export CSV'}
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 mt-3">
                      Saved filters persist for Quick Export and Email Export.
                    </p>
                  </DialogContent>
                </Dialog>

                {/* Selected export filters summary */}
                <div className="max-h-24 overflow-y-auto pr-1">
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {getExportSummaryItems().map((item, i) => (
                      <Badge key={`summary-${i}`} variant="secondary" className="inline-flex items-center gap-1">
                        {item.label}
                        {item.key === 'field' ? (
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-600"
                            onClick={() => clearExportField(item.fieldId!)}
                            aria-label={`Remove field ${item.label}`}
                          >
                            ×
                          </button>
                        ) : ((item.key === 'date' && (exportOptions.dateRange !== DATE_RANGES.ALL)) ||
                          (item.key === 'stage' && exportOptions.filterStage !== 'all') ||
                          (item.key === 'priority' && exportOptions.filterPriority !== 'all') ||
                          (item.key === 'status' && exportOptions.filterStatus !== 'all')) ? (
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-600"
                            onClick={() => clearExportFilter(item.key as 'stage' | 'priority' | 'status' | 'date')}
                            aria-label={`Clear ${item.key} filter`}
                          >
                            ×
                          </button>
                        ) : null}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {onEmailExport && (
                  <Dialog open={showEmailExport} onOpenChange={setShowEmailExport}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 flex-1">
                        <Mail className="h-4 w-4" />
                        Email Export
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Email Leads Export</DialogTitle>
                        <DialogDescription>
                          Enter your email address to receive the leads export
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium">
                            Email Address
                          </Label>
                          <input
                            id="email"
                            type="email"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          <p>• The export will include all leads matching your current filters</p>
                          <p>• You'll receive a CSV file as an email attachment</p>
                          <p>• The email will be sent from your organization's email address</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-4 flex-wrap mt-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowEmailExport(false)}
                          className="flex-1 sm:flex-none"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleEmailExport}
                          disabled={isEmailing || !emailAddress}
                          className="flex items-center gap-2 flex-1 sm:flex-none"
                        >
                          {isEmailing ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          {isEmailing ? 'Sending...' : 'Send Export'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Leads
            </CardTitle>
            <CardDescription>
              Import leads from a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <FileDropzone
                accept=".csv,text/csv"
                onFile={(file) => processCsvFile(file)}
                className=""
                title="Drag and drop your CSV here, or click to browse"
                subtitle="Only .csv files are accepted"
              />

              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                className="w-full flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Download Template
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-500 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p className="font-medium">Required fields:</p>
                  <p>Name</p>
                </div>
                <div>
                  <p className="font-medium">Optional fields:</p>
                  <p>Email, Phone, Company, Title, Stage, Priority, Value, Notes, Tags</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p className="font-medium">Stages:</p>
                  <p>new, contacted, qualified, proposal, closed-won, closed-lost</p>
                </div>
                <div>
                  <p className="font-medium">Priorities:</p>
                  <p>low, medium, high, critical</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Preview */}
      {showPreview && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Import Preview
              </CardTitle>
              <CardDescription>
                Review the leads that will be imported
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {showUploadingIndicator ? (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="mr-10 text-sm text-gray-600 dark:text-gray-400">{importPreview.length} leads ready</span>
              <Button onClick={handleImport} disabled={isImporting} className="flex items-center gap-2">
                {isImporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isImporting ? 'Importing...' : 'Import Leads'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm min-w-[900px]">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Name</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Email</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Phone</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Company</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Title</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Stage</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Priority</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Value</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Notes</th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Tags</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pagedPreview.map((lead, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-3 py-2">{lead.name || '-'}</td>
                            <td className="px-3 py-2">{lead.email || '-'}</td>
                            <td className="px-3 py-2">{lead.phone || '-'}</td>
                            <td className="px-3 py-2">{lead.company || '-'}</td>
                            <td className="px-3 py-2">{lead.title || '-'}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs">{lead.stage || '-'}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs">{lead.priority || '-'}</Badge>
                            </td>
                            <td className="px-3 py-2">{lead.value ?? '-'}</td>
                            <td className="px-3 py-2">{lead.notes || '-'}</td>
                            <td className="px-3 py-2">{(lead.tags && lead.tags.join(', ')) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                {importPreview.length > previewPageSize && (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                    ... and {importPreview.length - previewPageSize} more leads
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                {/* Bottom controls */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full justify-between">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Rows per page</span>
                      <select
                        value={previewPageSize}
                        onChange={(e) => { setPreviewPage(1); setPreviewPageSize(Number(e.target.value)); }}
                        className="border rounded px-2 py-1 bg-transparent w-full sm:w-auto"
                      >
                        {[10, 25, 50, 100].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Page {previewPage} of {totalPreviewPages}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" aria-label="First page" disabled={previewPage === 1} onClick={() => setPreviewPage(1)} className="px-2">1</Button>
                        <Button variant="outline" size="sm" aria-label="Previous page" disabled={previewPage === 1} onClick={() => setPreviewPage(p => Math.max(1, p - 1))} className="px-2">‹</Button>
                        <span className="px-2 text-xs">{previewPage}</span>
                        <Button variant="outline" size="sm" aria-label="Next page" disabled={previewPage === totalPreviewPages} onClick={() => setPreviewPage(p => Math.min(totalPreviewPages, p + 1))} className="px-2">›</Button>
                        <Button variant="outline" size="sm" aria-label="Last page" disabled={previewPage === totalPreviewPages} onClick={() => setPreviewPage(totalPreviewPages)} className="px-2">{totalPreviewPages}</Button>
                      </div>
                    </div>
                  </div>
                </div>

                {isImporting && (
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded">
                    <div
                      className="h-2 bg-blue-500 rounded transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, importProgress))}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 