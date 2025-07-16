import React, { useState } from 'react';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { X, User, Building2, Mail, Phone, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';

interface AddLeadModalProps {
  onClose: () => void;
}

const AddLeadModal: React.FC<AddLeadModalProps> = ({ onClose }) => {
  const { addLead } = useData();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    stage: 'new' as const,
    value: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addLead({
      ...formData,
      value: parseInt(formData.value) || 0,
      lastContact: new Date().toISOString().split('T')[0],
      assignedTo: [{
        id: user?.id || '',
        organizationId: user?.organizationId || '',
        role: 'admin',
        profile: {
          id: user?.id || '',
          first_name: user?.first_name || '',
          last_name: user?.last_name || '',
          avatar: user?.avatar || '',
          completed_onboarding: user?.completed_onboarding || false
        }
      }],
      title: '',
      description: '',
      category: '',
      status: 'active',
      priority: 'low',
      tags: [],
      updatedAt: new Date()
    });

    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg max-h-[60vh] overflow-y-auto w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add New Lead</h2>
          <Button variant="ghost" icon={<X className="h-6 w-6" />} onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter full name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter company name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deal Value
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter deal value"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Stage
            </label>
            <select
              name="stage"
              value={formData.stage}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="new">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any initial notes..."
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
            >
              Add Lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeadModal;