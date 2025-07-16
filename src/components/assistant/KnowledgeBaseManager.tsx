import React, { useState } from 'react';
import { useAssistant } from '../../hooks/useAssistant';
import { Plus, Search, FileText, HelpCircle, MessageSquare, Edit, Trash2, Upload } from 'lucide-react';
import { KnowledgeBaseItem } from '../../contexts/AssistantContext';
import Button from '../form/button/Button';

const KnowledgeBaseManager: React.FC = () => {
  const { knowledgeBase, addKnowledgeBaseItem, updateKnowledgeBaseItem, deleteKnowledgeBaseItem } = useAssistant();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'document' as 'document' | 'faq' | 'script'
  });

  const filteredItems = knowledgeBase.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateKnowledgeBaseItem(editingItem, formData);
      setEditingItem(null);
    } else {
      addKnowledgeBaseItem(formData);
    }
    setFormData({ title: '', content: '', type: 'document' });
    setShowAddModal(false);
  };

  const handleEdit = (item: KnowledgeBaseItem) => {
    setFormData({
      title: item.title,
      content: item.content,
      type: item.type
    });
    setEditingItem(item.id);
    setShowAddModal(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'faq':
        return <HelpCircle className="h-4 w-4" />;
      case 'script':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'faq':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'script':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search knowledge base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" startIcon={<Upload className="h-4 w-4" />}>
            Import
          </Button>
          <Button
            variant="primary"
            startIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowAddModal(true)}
          >
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-full ${getTypeColor(item.type)}`}>
                  {getTypeIcon(item.type)}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                  {item.type}
                </span>
              </div>
              <div className="flex space-x-1">
                <Button variant="icon" size="sm" startIcon={<Edit className="h-4 w-4" />} onClick={() => handleEdit(item)} />
                <Button variant="danger" size="sm" startIcon={<Trash2 className="h-4 w-4" />} onClick={() => deleteKnowledgeBaseItem(item.id)} />
              </div>
            </div>
            
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
              {item.content}
            </p>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Updated {new Date(item.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingItem ? 'Edit Knowledge Item' : 'Add Knowledge Item'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'document' | 'faq' | 'script' }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="document">Document</option>
                  <option value="faq">FAQ</option>
                  <option value="script">Script</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    setFormData({ title: '', content: '', type: 'document' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseManager;