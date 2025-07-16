import React, { useState } from 'react';
import { useAssistant } from '../../hooks/useAssistant';
import { Plus, Search, Mail, Edit, Trash2, Play, Pause, Copy, Clock } from 'lucide-react';
import { EmailSequence } from '../../contexts/AssistantContext';

const EmailSequenceBuilder: React.FC = () => {
  const { emailSequences, addEmailSequence, updateEmailSequence, deleteEmailSequence } = useAssistant();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    emails: [{ subject: '', content: '', delayDays: 0 }],
    active: true
  });

  const filteredSequences = emailSequences.filter(seq =>
    seq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seq.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sequenceData = {
      ...formData,
      emails: formData.emails.map((email, index) => ({
        id: Date.now().toString() + index,
        ...email,
        order: index + 1
      }))
    };

    if (editingSequence) {
      updateEmailSequence(editingSequence, sequenceData);
      setEditingSequence(null);
    } else {
      addEmailSequence(sequenceData);
    }
    
    setFormData({
      name: '',
      description: '',
      emails: [{ subject: '', content: '', delayDays: 0 }],
      active: true
    });
    setShowAddModal(false);
  };

  const addEmailStep = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, { subject: '', content: '', delayDays: 0 }]
    }));
  };

  const removeEmailStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };

  const updateEmailStep = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((email, i) => 
        i === index ? { ...email, [field]: value } : email
      )
    }));
  };

  const handleEdit = (sequence: EmailSequence) => {
    setFormData({
      name: sequence.name,
      description: sequence.description,
      emails: sequence.emails.map((email: EmailSequence['emails'][number]) => ({
        subject: email.subject,
        content: email.content,
        delayDays: email.delayDays
      })),
      active: sequence.active
    });
    setEditingSequence(sequence.id);
    setShowAddModal(true);
  };

  const toggleSequenceStatus = (id: string, active: boolean) => {
    updateEmailSequence(id, { active: !active });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search sequences..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Sequence</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSequences.map((sequence) => (
          <div key={sequence.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{sequence.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{sequence.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleSequenceStatus(sequence.id, sequence.active)}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    sequence.active
                      ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'
                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {sequence.active ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleEdit(sequence)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteEmailSequence(sequence.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {sequence.emails.map((email, index) => (
                <div key={email.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {email.subject}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>
                        {email.delayDays === 0 ? 'Immediate' : `${email.delayDays} days delay`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  sequence.active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {sequence.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {sequence.emails.length} emails
                </span>
              </div>
              <button className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                <Copy className="h-3 w-3" />
                <span>Duplicate</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingSequence ? 'Edit Email Sequence' : 'Create Email Sequence'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sequence Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Email Steps</h3>
                  <button
                    type="button"
                    onClick={addEmailStep}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Email</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.emails.map((email, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">Email {index + 1}</h4>
                        {formData.emails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEmailStep(index)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Subject Line
                          </label>
                          <input
                            type="text"
                            value={email.subject}
                            onChange={(e) => updateEmailStep(index, 'subject', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Delay (Days)
                          </label>
                          <input
                            type="number"
                            value={email.delayDays}
                            onChange={(e) => updateEmailStep(index, 'delayDays', parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Content
                        </label>
                        <textarea
                          value={email.content}
                          onChange={(e) => updateEmailStep(index, 'content', e.target.value)}
                          rows={6}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Use {{firstName}}, {{lastName}}, {{company}} for personalization"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSequence(null);
                    setFormData({
                      name: '',
                      description: '',
                      emails: [{ subject: '', content: '', delayDays: 0 }],
                      active: true
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {editingSequence ? 'Update' : 'Create'} Sequence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailSequenceBuilder;