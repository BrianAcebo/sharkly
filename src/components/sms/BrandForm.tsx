import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, Info, Building2 } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { BusinessType, Industry, Address, ComplianceContact } from '../../types/smsVerification';

interface BrandFormProps {
  orgId: string;
  onSave: () => void;
  userRole?: string;
}

type BrandRegistration = {
  legal_name: string;
  business_type: BusinessType | '';
  ein: string;
  website: string;
  industry: Industry | '';
  address: Address;
  contact: ComplianceContact;
};

const BrandForm: React.FC<BrandFormProps> = ({ orgId, onSave, userRole }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialBrandForm: BrandRegistration = {
    legal_name: '',
    business_type: '' as BusinessType | '',
    ein: '',
    website: '',
    industry: '' as Industry | '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    } as Address,
    contact: {
      name: '',
      email: '',
      phone: ''
    } as ComplianceContact
  };
  const [brandForm, setBrandForm] = useState<BrandRegistration>(initialBrandForm);

  useEffect(() => {
    if (orgId) {
      fetchBrandData();
    }
  }, [orgId]);

  const fetchBrandData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to view brand data');
        return;
      }

      const response = await fetch(`/api/sms/verification-status?orgId=${orgId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Brand data might not exist yet, which is fine
        return;
      }

      const data = await response.json();
      if (data.ok) {
        // TODO: Fetch brand profile data from a separate endpoint
        // For now, we'll just show the empty form
      }
    } catch (error) {
      console.error('Error fetching brand data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const child = field.split('.')[1] as keyof Address;
      setBrandForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [child]: value
        }
      }));
      return;
    }

    if (field.startsWith('contact.')) {
      const child = field.split('.')[1] as keyof ComplianceContact;
      setBrandForm((prev) => ({
        ...prev,
        contact: {
          ...prev.contact,
          [child]: value
        }
      }));
      return;
    }

    setBrandForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (field: keyof ComplianceContact, value: string) => {
    setBrandForm((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    // Check if user has permission to edit
    if (userRole && !['owner', 'admin'].includes(userRole)) {
      toast.error('Only organization owners and admins can edit SMS verification settings');
      return;
    }

    if (!brandForm.legal_name || !brandForm.business_type || !brandForm.ein || 
        !brandForm.website || !brandForm.industry || !brandForm.address.street || 
        !brandForm.address.city || !brandForm.address.state || !brandForm.address.zip || 
        !brandForm.contact.name || !brandForm.contact.email || !brandForm.contact.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to save brand data');
        return;
      }

      const response = await fetch('/api/sms/save-brand', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgId,
          ...brandForm
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save brand data');
      }

      const data = await response.json();
      if (data.ok) {
        toast.success('Brand information saved successfully');
        onSave();
      } else {
        toast.error(data.error || 'Failed to save brand data');
      }
    } catch (error) {
      console.error('Error saving brand data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save brand data');
    } finally {
      setSaving(false);
    }
  };

  // Check if user has permission to edit
  const canEdit = !userRole || ['owner', 'admin'].includes(userRole);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Business Information</span>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Provide your business details for SMS compliance verification
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Access Restricted
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Only organization owners and admins can edit SMS verification settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Business Information</span>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Provide your business details for SMS compliance verification
        </p>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Legal Name */}
          <div className="md:col-span-2">
            <Label htmlFor="legal_name">Legal Business Name *</Label>
            <Input
              id="legal_name"
              value={brandForm.legal_name}
              onChange={(e) => handleInputChange('legal_name', e.target.value)}
              placeholder="Enter your legal business name"
              required
            />
          </div>

          {/* Business Type */}
          <div>
            <Label htmlFor="business_type">Business Type *</Label>
            <Select
              value={brandForm.business_type}
              onValueChange={(value) => handleInputChange('business_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="llc">LLC</SelectItem>
                <SelectItem value="corporation">Corporation</SelectItem>
                <SelectItem value="sole_prop">Sole Proprietorship</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="non_profit">Non-Profit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* EIN */}
          <div>
            <Label htmlFor="ein">
              <Tooltip content="Carriers require a Tax ID to verify your brand. We never use it for billing—only for SMS compliance.">
                <span className="flex items-center space-x-1">
                  <span>EIN (Tax ID) *</span>
                  <Info className="h-4 w-4 text-gray-400" />
                </span>
              </Tooltip>
            </Label>
            <Input
              id="ein"
              value={brandForm.ein}
              onChange={(e) => handleInputChange('ein', e.target.value)}
              placeholder="XX-XXXXXXX"
              required
            />
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website">Website *</Label>
            <Input
              id="website"
              value={brandForm.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://example.com"
              type="url"
              required
            />
          </div>

          {/* Industry */}
          <div>
            <Label htmlFor="industry">Industry *</Label>
            <Select
              value={brandForm.industry}
              onValueChange={(value) => handleInputChange('industry', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="real_estate">Real Estate</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="saas">SaaS</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Registered Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="address.street">Street Address *</Label>
              <Input
                id="address.street"
                value={brandForm.address.street}
                onChange={(e) => handleInputChange('address.street', e.target.value)}
                placeholder="123 Main Street"
                required
              />
            </div>
            <div>
              <Label htmlFor="address.city">City *</Label>
              <Input
                id="address.city"
                value={brandForm.address.city}
                onChange={(e) => handleInputChange('address.city', e.target.value)}
                placeholder="New York"
                required
              />
            </div>
            <div>
              <Label htmlFor="address.state">State *</Label>
              <Input
                id="address.state"
                value={brandForm.address.state}
                onChange={(e) => handleInputChange('address.state', e.target.value)}
                placeholder="NY"
                required
              />
            </div>
            <div>
              <Label htmlFor="address.zip">ZIP Code *</Label>
              <Input
                id="address.zip"
                value={brandForm.address.zip}
                onChange={(e) => handleInputChange('address.zip', e.target.value)}
                placeholder="10001"
                required
              />
            </div>
            <div>
              <Label htmlFor="address.country">Country *</Label>
              <Select
                value={brandForm.address.country}
                onValueChange={(value) => handleInputChange('address.country', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Compliance Contact Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Compliance Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact.name">Contact Name *</Label>
              <Input
                id="contact.name"
                value={brandForm.contact.name}
                onChange={(e) => handleContactChange('name', e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Label htmlFor="contact.email">Contact Email *</Label>
              <Input
                id="contact.email"
                value={brandForm.contact.email}
                onChange={(e) => handleContactChange('email', e.target.value)}
                placeholder="john@example.com"
                type="email"
                required
              />
            </div>
            <div>
              <Label htmlFor="contact.phone">Contact Phone *</Label>
              <Input
                id="contact.phone"
                value={brandForm.contact.phone}
                onChange={(e) => handleContactChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Brand Information'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandForm;
