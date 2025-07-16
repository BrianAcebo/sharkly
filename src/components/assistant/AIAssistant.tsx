import React, { useState } from 'react';
import { useAssistant } from '../../hooks/useAssistant';
import { 
  Bot, 
  FileText, 
  Mail, 
  MessageSquare, 
  Phone,
  Settings,
  Brain,
  Zap
} from 'lucide-react';
import Button from '../form/button/Button';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import EmailSequenceBuilder from './EmailSequenceBuilder';
import TextSequenceBuilder from './TextSequenceBuilder';
import CallQuestionnaireBuilder from './CallQuestionnaireBuilder';

const AIAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'knowledge' | 'email' | 'text' | 'call'>('overview');
  const { knowledgeBase, emailSequences, textSequences, callQuestionnaires } = useAssistant();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Bot },
    { id: 'knowledge', label: 'Knowledge Base', icon: Brain },
    { id: 'email', label: 'Email Sequences', icon: Mail },
    { id: 'text', label: 'Text Sequences', icon: MessageSquare },
    { id: 'call', label: 'Call Scripts', icon: Phone }
  ];

  const stats = [
    {
      label: 'Knowledge Items',
      value: knowledgeBase.length,
      icon: FileText,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
    },
    {
      label: 'Email Sequences',
      value: emailSequences.length,
      icon: Mail,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
    },
    {
      label: 'Text Sequences',
      value: textSequences.length,
      icon: MessageSquare,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    },
    {
      label: 'Call Scripts',
      value: callQuestionnaires.length,
      icon: Phone,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-red-500 to-purple-600 rounded-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Assistant</h1>
              <p className="text-gray-600 dark:text-gray-400">Automate lead qualification and follow-up</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="primary" startIcon={<Zap className="h-4 w-4" />}>
              Train AI
            </Button>
            <Button variant="outline" startIcon={<Settings className="h-4 w-4" />}>
              Settings
            </Button>
          </div>
        </div>

        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'knowledge' | 'email' | 'text' | 'call')}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Email sequence "Welcome Series" sent to 5 leads</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                      <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Knowledge base updated with new FAQ</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                      <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Text sequence completed for 3 leads</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">6 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Lead Qualification Rate</span>
                      <span className="font-medium text-gray-900 dark:text-white">78%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Email Response Rate</span>
                      <span className="font-medium text-gray-900 dark:text-white">45%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Call Success Rate</span>
                      <span className="font-medium text-gray-900 dark:text-white">62%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '62%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && <KnowledgeBaseManager />}
        {activeTab === 'email' && <EmailSequenceBuilder />}
        {activeTab === 'text' && <TextSequenceBuilder />}
        {activeTab === 'call' && <CallQuestionnaireBuilder />}
      </div>
    </div>
  );
};

export default AIAssistant;