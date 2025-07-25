import React, { useState } from 'react';
import { useAssistant } from '../../hooks/useAssistant';
import { Plus, Search, Phone, Edit, Trash2, Play, Pause, Copy, HelpCircle } from 'lucide-react';
import { CallQuestionnaire } from '../../contexts/AssistantContext';

const CallQuestionnaireBuilder: React.FC = () => {
  const { callQuestionnaires, addCallQuestionnaire, updateCallQuestionnaire, deleteCallQuestionnaire } = useAssistant();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    questions: [{ question: '', type: 'open' as 'open' | 'yes_no' | 'multiple_choice', options: [''], required: true }],
    active: true
  });

  const filteredQuestionnaires = callQuestionnaires.filter(q =>
    q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const questionnaireData = {
      ...formData,
      questions: formData.questions.map((question, index) => ({
        id: Date.now().toString() + index,
        ...question,
        order: index + 1,
        options: question.type === 'multiple_choice' ? question.options.filter(opt => opt.trim()) : undefined
      }))
    };

    if (editingQuestionnaire) {
      updateCallQuestionnaire(editingQuestionnaire, questionnaireData);
      setEditingQuestionnaire(null);
    } else {
      addCallQuestionnaire(questionnaireData);
    }
    
    setFormData({
      name: '',
      description: '',
      questions: [{ question: '', type: 'open', options: [''], required: true }],
      active: true
    });
    setShowAddModal(false);
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { question: '', type: 'open', options: [''], required: true }]
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const updateQuestion = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, i) => 
        i === index ? { ...question, [field]: value } : question
      )
    }));
  };

  const addOption = (questionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, i) => 
        i === questionIndex 
          ? { ...question, options: [...question.options, ''] }
          : question
      )
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, i) => 
        i === questionIndex 
          ? { 
              ...question, 
              options: question.options.map((opt, j) => j === optionIndex ? value : opt)
            }
          : question
      )
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((question, i) => 
        i === questionIndex 
          ? { ...question, options: question.options.filter((_, j) => j !== optionIndex) }
          : question
      )
    }));
  };

  const handleEdit = (questionnaire: CallQuestionnaire) => {
    setFormData({
      name: questionnaire.name,
      description: questionnaire.description,
      questions: questionnaire.questions.map((q: CallQuestionnaire['questions'][number]) => ({
        question: q.question,
        type: q.type,
        options: q.options || [''],
        required: q.required
      })),
      active: questionnaire.active
    });
    setEditingQuestionnaire(questionnaire.id);
    setShowAddModal(true);
  };

  const toggleQuestionnaireStatus = (id: string, active: boolean) => {
    updateCallQuestionnaire(id, { active: !active });
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'open':
        return 'Open-ended';
      case 'yes_no':
        return 'Yes/No';
      case 'multiple_choice':
        return 'Multiple Choice';
      default:
        return type;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search questionnaires..."
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
          <span>Create Questionnaire</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredQuestionnaires.map((questionnaire) => (
          <div key={questionnaire.id} className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                  <Phone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{questionnaire.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{questionnaire.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleQuestionnaireStatus(questionnaire.id, questionnaire.active)}
                  className={`p-2 rounded-lg transition-colors duration-200 ${
                    questionnaire.active
                      ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'
                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {questionnaire.active ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleEdit(questionnaire)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteCallQuestionnaire(questionnaire.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {questionnaire.questions.slice(0, 3).map((question, index) => (
                <div key={question.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {question.question.length > 60 ? `${question.question.substring(0, 60)}...` : question.question}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <HelpCircle className="h-3 w-3" />
                      <span>{getQuestionTypeLabel(question.type)}</span>
                      {question.required && <span className="text-red-500">Required</span>}
                    </div>
                  </div>
                </div>
              ))}
              {questionnaire.questions.length > 3 && (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  +{questionnaire.questions.length - 3} more questions
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  questionnaire.active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {questionnaire.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {questionnaire.questions.length} questions
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

      {filteredQuestionnaires.length === 0 && (
        <div className="text-center py-12">
          <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No call questionnaires found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Create your first questionnaire
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingQuestionnaire ? 'Edit Call Questionnaire' : 'Create Call Questionnaire'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Questionnaire Name
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
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Questions</h3>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {formData.questions.map((question, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">Question {index + 1}</h4>
                        {formData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Question
                          </label>
                          <input
                            type="text"
                            value={question.question}
                            onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Type
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="open">Open-ended</option>
                            <option value="yes_no">Yes/No</option>
                            <option value="multiple_choice">Multiple Choice</option>
                          </select>
                        </div>
                      </div>

                      {question.type === 'multiple_choice' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Options
                          </label>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                {question.options.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(index, optionIndex)}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOption(index)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                            >
                              + Add Option
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Required question
                        </label>
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
                    setEditingQuestionnaire(null);
                    setFormData({
                      name: '',
                      description: '',
                      questions: [{ question: '', type: 'open', options: [''], required: true }],
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
                  {editingQuestionnaire ? 'Update' : 'Create'} Questionnaire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallQuestionnaireBuilder;