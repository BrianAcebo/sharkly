import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { AlertCircle, Info, MessageSquare, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { OptInMethod } from '../../types/smsVerification';

interface CampaignFormProps {
  orgId: string;
  onSave: () => void;
  onSubmit10DLC: () => void;
  userRole?: string;
}

const CampaignForm: React.FC<CampaignFormProps> = ({ orgId, onSave, onSubmit10DLC, userRole }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [formData, setFormData] = useState({
    use_case_description: '',
    opt_in_method: '' as OptInMethod | '',
    sample_msg_1: '',
    sample_msg_2: '',
    opt_out_text: 'Reply STOP to opt out.',
    help_text: 'Reply HELP for help or email support@example.com',
    terms_url: '',
    privacy_url: '',
    est_monthly_messages: 1000,
    countries: ['US'] as string[]
  });

  useEffect(() => {
    if (orgId) {
      fetchCampaignData();
      fetchBrandName();
    }
  }, [orgId]);

  const fetchBrandName = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // TODO: Fetch brand name from brand profile
      // For now, we'll use a placeholder
      setBrandName('Your Business Name');
    } catch (error) {
      console.error('Error fetching brand name:', error);
    }
  };

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to view campaign data');
        return;
      }

      // TODO: Fetch campaign profile data from a separate endpoint
      // For now, we'll just show the empty form
    } catch (error) {
      console.error('Error fetching campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCountryChange = (country: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      countries: checked 
        ? [...prev.countries, country]
        : prev.countries.filter(c => c !== country)
    }));
  };

  const validateSampleMessages = () => {
    const sample1Lower = formData.sample_msg_1.toLowerCase();
    const sample2Lower = formData.sample_msg_2.toLowerCase();
    const brandNameLower = brandName.toLowerCase();
    
    const hasBrandName = sample1Lower.includes(brandNameLower) || sample2Lower.includes(brandNameLower);
    const hasStopHelp = sample1Lower.includes('stop') || sample1Lower.includes('help') || 
                       sample2Lower.includes('stop') || sample2Lower.includes('help');

    return { hasBrandName, hasStopHelp };
  };

  const handleSave = async () => {
    // Check if user has permission to edit
    if (userRole && !['owner', 'admin'].includes(userRole)) {
      toast.error('Only organization owners and admins can edit SMS verification settings');
      return;
    }

    if (!formData.use_case_description || !formData.opt_in_method || 
        !formData.sample_msg_1 || !formData.sample_msg_2 || 
        !formData.terms_url || !formData.privacy_url) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { hasBrandName, hasStopHelp } = validateSampleMessages();
    if (!hasBrandName) {
      toast.error('At least one sample message must include your brand name');
      return;
    }
    if (!hasStopHelp) {
      toast.error('At least one sample message must include STOP or HELP');
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to save campaign data');
        return;
      }

      const response = await fetch('/api/sms/save-campaign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgId,
          ...formData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save campaign data');
      }

      const data = await response.json();
      if (data.ok) {
        toast.success('Campaign information saved successfully');
        onSave();
      } else {
        toast.error(data.error || 'Failed to save campaign data');
      }
    } catch (error) {
      console.error('Error saving campaign data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save campaign data');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit10DLC = async () => {
    // Check if user has permission to edit
    if (userRole && !['owner', 'admin'].includes(userRole)) {
      toast.error('Only organization owners and admins can edit SMS verification settings');
      return;
    }

    if (!formData.use_case_description || !formData.opt_in_method || 
        !formData.sample_msg_1 || !formData.sample_msg_2 || 
        !formData.terms_url || !formData.privacy_url) {
      toast.error('Please save campaign information first');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('You must be logged in to submit 10DLC application');
        return;
      }

      const response = await fetch('/api/sms/submit-10dlc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orgId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit 10DLC application');
      }

      const data = await response.json();
      if (data.ok) {
        toast.success('10DLC application submitted successfully');
        onSubmit10DLC();
      } else {
        toast.error(data.error || 'Failed to submit 10DLC application');
      }
    } catch (error) {
      console.error('Error submitting 10DLC application:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit 10DLC application');
    } finally {
      setSubmitting(false);
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
            <MessageSquare className="h-5 w-5" />
            <span>Messaging Use Case</span>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define how you'll use SMS messaging for your business
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

  const { hasBrandName, hasStopHelp } = validateSampleMessages();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Messaging Use Case</span>
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Define how you'll use SMS messaging for your business
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campaign Helper */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Campaign Helper:</strong> At least one sample must include your brand name, and one must include 'STOP'/'HELP'.
              </p>
            </div>
          </div>
        </div>

        {/* Use Case Description */}
        <div>
          <Label htmlFor="use_case_description">Use Case Description *</Label>
          <textarea
            id="use_case_description"
            value={formData.use_case_description}
            onChange={(e) => handleInputChange('use_case_description', e.target.value)}
            placeholder="e.g., Lead follow-up & appointment setting for inbound/outbound sales"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            rows={3}
            required
          />
        </div>

        {/* Opt-in Method */}
        <div>
          <Label htmlFor="opt_in_method">Opt-in Method *</Label>
          <Select
            value={formData.opt_in_method}
            onValueChange={(value) => handleInputChange('opt_in_method', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select opt-in method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="web_form">Web Form</SelectItem>
              <SelectItem value="paper_form">Paper Form</SelectItem>
              <SelectItem value="verbal">Verbal</SelectItem>
              <SelectItem value="existing_customer">Existing Customer</SelectItem>
              <SelectItem value="keyword">Keyword</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sample Messages */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sample Messages</h3>
          
          <div>
            <Label htmlFor="sample_msg_1">Sample Message 1 *</Label>
            <textarea
              id="sample_msg_1"
              value={formData.sample_msg_1}
              onChange={(e) => handleInputChange('sample_msg_1', e.target.value)}
              placeholder={`e.g., Hi! This is ${brandName}. Thanks for your interest in our services.`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              rows={2}
              required
            />
            {formData.sample_msg_1 && (
              <div className="mt-1 flex items-center space-x-2">
                {hasBrandName ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${hasBrandName ? 'text-green-600' : 'text-red-600'}`}>
                  {hasBrandName ? 'Includes brand name' : 'Must include brand name'}
                </span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="sample_msg_2">Sample Message 2 *</Label>
            <textarea
              id="sample_msg_2"
              value={formData.sample_msg_2}
              onChange={(e) => handleInputChange('sample_msg_2', e.target.value)}
              placeholder="e.g., Your appointment is confirmed for tomorrow at 2 PM. Reply STOP to opt out."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              rows={2}
              required
            />
            {formData.sample_msg_2 && (
              <div className="mt-1 flex items-center space-x-2">
                {hasStopHelp ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${hasStopHelp ? 'text-green-600' : 'text-red-600'}`}>
                  {hasStopHelp ? 'Includes STOP/HELP' : 'Must include STOP or HELP'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Opt-out and Help Text */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="opt_out_text">Opt-out Text *</Label>
            <Input
              id="opt_out_text"
              value={formData.opt_out_text}
              onChange={(e) => handleInputChange('opt_out_text', e.target.value)}
              placeholder="Reply STOP to opt out."
              required
            />
          </div>
          <div>
            <Label htmlFor="help_text">Help Text *</Label>
            <Input
              id="help_text"
              value={formData.help_text}
              onChange={(e) => handleInputChange('help_text', e.target.value)}
              placeholder="Reply HELP for help or email support@example.com"
              required
            />
          </div>
        </div>

        {/* URLs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="terms_url">Terms URL *</Label>
            <Input
              id="terms_url"
              value={formData.terms_url}
              onChange={(e) => handleInputChange('terms_url', e.target.value)}
              placeholder="https://example.com/terms"
              type="url"
              required
            />
          </div>
          <div>
            <Label htmlFor="privacy_url">Privacy URL *</Label>
            <Input
              id="privacy_url"
              value={formData.privacy_url}
              onChange={(e) => handleInputChange('privacy_url', e.target.value)}
              placeholder="https://example.com/privacy"
              type="url"
              required
            />
          </div>
        </div>

        {/* Monthly Messages */}
        <div>
          <Label htmlFor="est_monthly_messages">Estimated Monthly Messages *</Label>
          <Input
            id="est_monthly_messages"
            value={formData.est_monthly_messages}
            onChange={(e) => handleInputChange('est_monthly_messages', parseInt(e.target.value) || 0)}
            placeholder="1000"
            type="number"
            min="1"
            required
          />
        </div>

        {/* Countries */}
        <div>
          <Label>Countries *</Label>
          <div className="mt-2 space-y-2">
            {[
              { value: 'US', label: 'United States' },
              { value: 'CA', label: 'Canada' }
            ].map((country) => (
              <div key={country.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`country-${country.value}`}
                  checked={formData.countries.includes(country.value)}
                  onCheckedChange={(checked) => handleCountryChange(country.value, checked as boolean)}
                />
                <Label htmlFor={`country-${country.value}`} className="text-sm">
                  {country.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Campaign'}</span>
          </Button>

          <Button
            onClick={handleSubmit10DLC}
            disabled={submitting || !hasBrandName || !hasStopHelp}
            className="flex items-center space-x-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{submitting ? 'Submitting...' : 'Submit for A2P Approval'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignForm;
