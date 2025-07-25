import React, { useState } from 'react';
import { useAssistant } from '../../hooks/useAssistant';
import { Plus, Search, MessageSquare, Edit, Trash2, Play, Pause, Copy, Clock } from 'lucide-react';
import { TextSequence } from '../../contexts/AssistantContext';
import { Button } from '../ui/button';

const TextSequenceBuilder: React.FC = () => {
  const { textSequences, addTextSequence, updateTextSequence, deleteTextSequence } = useAssistant();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    messages: [{ content: '', delayHours: 0 }],
    active: true
  });

  const filteredSequences = textSequences.filter(seq =>
    seq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seq.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sequenceData = {
      ...formData,
      messages: formData.messages.map((message, index) => ({
        id: Date.now().toString() + index,
        ...message,
        order: index + 1
      }))
    };

    if (editingSequence) {
      updateTextSequence(editingSequence, sequenceData);
      setEditingSequence(null);
    } else {
      addTextSequence(sequenceData);
    }
    
    setFormData({
      name: '',
      description: '',
      messages: [{ content: '', delayHours: 0 }],
      active: true
    });
    setShowAddModal(false);
  };

  const addMessageStep = () => {
    setFormData(prev => ({
      ...prev,
      messages: [...prev.messages, { content: '', delayHours: 0 }]
    }));
  };

  const removeMessageStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      messages: prev.messages.filter((_, i) => i !== index)
    }));
  };

  const updateMessageStep = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      messages: prev.messages.map((message, i) => 
        i === index ? { ...message, [field]: value } : message
      )
    }));
  };

  const handleEdit = (sequence: TextSequence) => {
    setFormData({
      name: sequence.name,
      description: sequence.description,
      messages: sequence.messages.map((message: TextSequence['messages'][number]) => ({
        content: message.content,
        delayHours: message.delayHours
      })),
      active: sequence.active
    });
    setEditingSequence(sequence.id);
    setShowAddModal(true);
  };

  const toggleSequenceStatus = (id: string, active: boolean) => {
    updateTextSequence(id, { active: !active });
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
        <Button
          variant="primary"
          startIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Create Sequence
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSequences.map((sequence) => (
          <div key={sequence.id} className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{sequence.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{sequence.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={sequence.active ? "success" : "ghost"}
                  startIcon={sequence.active ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  onClick={() => toggleSequenceStatus(sequence.id, sequence.active)}
                />
                <Button
                  variant="icon"
                  startIcon={<Edit className="h-4 w-4" />}
                  onClick={() => handleEdit(sequence)}
                />
                <Button
                  variant="danger"
                  startIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => deleteTextSequence(sequence.id)}
                />
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {sequence.messages.map((message, index) => (
                <div key={message.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {message.content.length > 60 ? `${message.content.substring(0, 60)}...` : message.content}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {message.delayHours === 0 ? 'Immediate' : `${message.delayHours} hours delay`}
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
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {sequence.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {sequence.messages.length} messages
                </span>
              </div>
              <Button variant="ghost" size="sm" startIcon={<Copy className="h-3 w-3" />}>
                Duplicate
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredSequences.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No text sequences found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Create your first text sequence
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingSequence ? 'Edit Text Sequence' : 'Create Text Sequence'}
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
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Message Steps</h3>
                  <button
                    type="button"
                    onClick={addMessageStep}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Message</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.messages.map((message, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">Message {index + 1}</h4>
                        {formData.messages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMessageStep(index)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Message Content
                          </label>
                          <textarea
                            value={message.content}
                            onChange={(e) => updateMessageStep(index, 'content', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Use {{firstName}}, {{lastName}}, {{company}} for personalization"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Delay (Hours)
                          </label>
                          <input
                            type="number"
                            value={message.delayHours}
                            onChange={(e) => updateMessageStep(index, 'delayHours', parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            required
                          />
                        </div>
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
                      messages: [{ content: '', delayHours: 0 }],
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

export default TextSequenceBuilder;