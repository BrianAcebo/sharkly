import React, { useState } from 'react';
import { Button } from '../ui/button';
import { createLeadService } from '../../utils/leadService';
import { CreateLeadData } from '../../types/leads';
import { toast } from 'sonner';
import { parseSupabaseError } from '../../utils/error';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { TeamMemberSelect } from './TeamMemberSelect';
import { User, Mail, Phone, Building2, DollarSign, X, Loader2, AlertCircle } from 'lucide-react';
import { LEAD_STAGES, LEAD_PRIORITIES } from '../../utils/constants';

interface AddLeadModalProps {
  onClose: () => void;
  onLeadCreated?: () => void;
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({ onClose, onLeadCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { teamMembers, isLoading: isLoadingTeamMembers } = useTeamMembers();
  const [formData, setFormData] = useState<CreateLeadData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    value: 0,
    priority: LEAD_PRIORITIES.LOW,
    stage: LEAD_STAGES.NEW,
    category: '',
    notes: '',
    assigned_to: undefined
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');
    console.log('Form data:', formData);
    console.log('Assigned to:', formData.assigned_to);
    console.log('Team members available:', teamMembers);
    
    setIsLoading(true);
    setErrorMessage(null); // Clear any previous errors
    
    try {
      const result = await createLeadService(formData);
      console.log('Lead created successfully:', result);
      
      onLeadCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating lead:', error);
      
      // Parse the error and show it to the user
      const parsedError = parseSupabaseError(error);
      console.log('Parsed error:', parsedError);
      
      // Show user-friendly error message
      let errorMessage = parsedError.message;
      let errorTitle = 'Failed to Create Lead';
      
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('Input changed:', name, value);
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: name === 'value' ? (value === '' ? undefined : Number(value)) : value
      };
      console.log('Updated form data:', newData);
      return newData;
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg max-h-[80vh] overflow-y-auto w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Lead</h2>
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
                  value={formData.value}
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
              Initial Stage
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
              Assign To
            </label>
            <TeamMemberSelect
              teamMembers={teamMembers}
              selectedMember={formData.assigned_to}
              onMemberSelect={(member) => {
                setFormData(prev => ({
                  ...prev,
                  assigned_to: member
                }));
              }}
              placeholder="Select team member (optional)"
              disabled={isLoading}
              isLoading={isLoadingTeamMembers}
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
              placeholder="Add any initial notes..."
              disabled={isLoading}
            />
          </div>

          <div className="flex space-x-4 pt-4">
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
                  Creating...
                </>
              ) : (
                'Add Lead'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeadModal;