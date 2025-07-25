import React, { useState } from 'react';
import { Button } from '../ui/button';
import { User, Mail, Phone, Building2, DollarSign, X, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LeadService } from '../../utils/leadService';
import { UpdateLeadData } from '../../types/leads';
import { Lead } from '../../contexts/DataContext';
import { parseSupabaseError } from '../../utils/error';

interface EditLeadModalProps {
  lead: Lead;
  onClose: () => void;
  onLeadUpdated?: () => void;
  onLeadDeleted?: () => void;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({ lead, onClose, onLeadUpdated, onLeadDeleted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateLeadData>({
    name: lead.name,
    email: lead.email,
    phone: lead.phone || '',
    company: lead.company || '',
    value: lead.value || 0,
    priority: lead.priority,
    stage: lead.stage,
    category: lead.category || '',
    notes: lead.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');
    console.log('Form data:', formData);
    
    setIsLoading(true);
    setErrorMessage(null); // Clear any previous errors
    
    try {
      const result = await LeadService.updateLead(lead.id, formData);
      console.log('Lead updated successfully:', result);
      
      onLeadUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error updating lead:', error);
      
      // Parse the error and show it to the user
      const parsedError = parseSupabaseError(error);
      console.log('Parsed error:', parsedError);
      
      // Show user-friendly error message
      let errorMessage = parsedError.message;
      let errorTitle = 'Failed to Update Lead';
      
      // Handle specific error types with more user-friendly messages
      if (parsedError.message.includes('Database policy configuration error')) {
        errorTitle = 'System Configuration Error';
        errorMessage = 'There is a temporary system configuration issue. Please try again in a few minutes or contact support if the problem persists.';
      } else if (parsedError.message.includes('User not authenticated')) {
        errorTitle = 'Authentication Required';
        errorMessage = 'Please sign in again to continue.';
      } else if (parsedError.message.includes('User not associated with any organization')) {
        errorTitle = 'Organization Setup Required';
        errorMessage = 'Your account needs to be set up with an organization. Please contact your administrator.';
      } else if (parsedError.message.includes('No matching record found')) {
        errorTitle = 'Account Setup Required';
        errorMessage = 'Your account is not properly set up. Please contact your administrator to set up your organization.';
      } else if (parsedError.message.includes('Database schema configuration issue')) {
        errorTitle = 'System Configuration Error';
        errorMessage = 'There is a temporary database configuration issue. Please try again in a few minutes.';
      }
      
      // Set error message for display in UI
      setErrorMessage(errorMessage);
      
      // Show error toast to user
      console.log('Showing error toast...', { title: errorTitle, description: errorMessage });
      toast.error(`${errorTitle}: ${errorMessage}`);
      console.log('Error toast called');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await LeadService.deleteLead(lead.id);
      console.log('Lead deleted successfully');
      toast.success('Lead deleted successfully!');
      onLeadDeleted?.();
      onClose();
    } catch (error) {
      console.error('Error deleting lead:', error);
      
      const parsedError = parseSupabaseError(error);
      const errorMessage = parsedError.message;
      const errorTitle = 'Failed to Delete Lead';
      
      setErrorMessage(errorMessage);
      toast.error(`${errorTitle}: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('Input changed:', name, value);
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: name === 'value' ? (value === '' ? 0 : Number(value)) : value
      };
      console.log('Updated form data:', newData);
      return newData;
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg max-h-[80vh] overflow-y-auto w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Lead</h2>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={onClose} disabled={isLoading}>
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-red-800 dark:text-red-200 text-sm font-medium">
                {errorMessage}
              </span>
            </div>
          </div>
        )}

        <form 
          onSubmit={handleSubmit} 
          className="space-y-4"
          onClick={() => console.log('Form clicked')}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="Enter full name"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="Enter email address"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="Enter phone number"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="Enter company name"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deal Value
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  name="value"
                  value={formData.value || ''}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                disabled={isLoading}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stage
            </label>
            <select
              name="stage"
              value={formData.stage}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              disabled={isLoading}
            >
              <option value="new">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="closed-won">Closed Won</option>
              <option value="closed-lost">Closed Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="e.g., SaaS, Enterprise, Startup"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="Add any notes..."
              disabled={isLoading}
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || isDeleting}
              className="flex-1"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
              onClick={(e) => {
                console.log('Submit button clicked!');
                console.log('Form element:', e.currentTarget.form);
                console.log('Form validity:', e.currentTarget.form?.checkValidity());
                
                // Manual form submission test
                if (e.currentTarget.form) {
                  console.log('Manually submitting form...');
                  e.currentTarget.form.requestSubmit();
                }
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Lead'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLeadModal; 