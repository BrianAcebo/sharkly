import React, { useState, useRef, useEffect } from 'react';
import { Search, MoreHorizontal, Phone, Video, Paperclip, Mic, Send, Smile } from 'lucide-react';
import { Button } from '../ui/button';

interface ChatUser {
  id: string;
  name: string;
  role: string;
  avatar: string;
  lastSeen: string;
  online: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image';
}

const mockUsers: ChatUser[] = [
  {
    id: '1',
    name: 'Kaiya George',
    role: 'Project Manager',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    lastSeen: '15 mins',
    online: true
  },
  {
    id: '2',
    name: 'Lindsey Curtis',
    role: 'Designer',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    lastSeen: '30 mins',
    online: true
  },
  {
    id: '3',
    name: 'Zain Geidt',
    role: 'Content Writer',
    avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    lastSeen: '45 mins',
    online: true
  },
  {
    id: '4',
    name: 'Carla George',
    role: 'Front-end Developer',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    lastSeen: '2 days',
    online: false
  },
  {
    id: '5',
    name: 'Abram Schleifer',
    role: 'Digital Marketer',
    avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    lastSeen: '1 hour',
    online: true
  },
  {
    id: '6',
    name: 'Lincoln Donin',
    role: 'Project Manager/Product Designer',
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    lastSeen: '3 days',
    online: false
  },
  {
    id: '7',
    name: 'Erin Geidthem',
    role: 'Copyrighter',
    avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    lastSeen: '5 days',
    online: false
  },
  {
    id: '8',
    name: 'Alena Baptista',
    role: 'SEO Expert',
    avatar: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    lastSeen: '2 hours',
    online: false
  }
];

const mockMessages: Message[] = [
  {
    id: '1',
    senderId: '2',
    content: 'I want to make an appointment tomorrow from 2:00 to 5:00pm?',
    timestamp: 'Lindsey, 2 hours ago',
    type: 'text'
  },
  {
    id: '2',
    senderId: 'current',
    content: "If don't like something, I'll stay away from it.",
    timestamp: '2 hours ago',
    type: 'text'
  },
  {
    id: '3',
    senderId: '2',
    content: 'I want more detailed information.',
    timestamp: 'Lindsey, 2 hours ago',
    type: 'text'
  },
  {
    id: '4',
    senderId: 'current',
    content: "If don't like something, I'll stay away from it.",
    timestamp: '2 hours ago',
    type: 'text'
  },
  {
    id: '5',
    senderId: 'current',
    content: 'They got there early, and got really good seats.',
    timestamp: '2 hours ago',
    type: 'text'
  },
  {
    id: '6',
    senderId: '2',
    content: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1',
    timestamp: 'Lindsey, 2 hours ago',
    type: 'image'
  }
];

const Chat: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<ChatUser>(mockUsers[1]);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        senderId: 'current',
        content: newMessage,
        timestamp: 'now',
        type: 'text'
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Chat List Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chats</h2>
            <Button variant="icon" startIcon={<MoreHorizontal className="h-5 w-5" />} />
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                selectedUser.id === user.id ? 'bg-gray-50 dark:bg-gray-700' : ''
              }`}
            >
              <div className="relative mr-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {user.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">{user.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{user.lastSeen}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                {selectedUser.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{selectedUser.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.role}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="icon" startIcon={<Phone className="h-5 w-5" />} />
              <Button variant="icon" startIcon={<Video className="h-5 w-5" />} />
              <Button variant="icon" startIcon={<MoreHorizontal className="h-5 w-5" />} />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === 'current' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${message.senderId === 'current' ? 'order-2' : 'order-1'}`}>
                {message.senderId !== 'current' && (
                  <div className="flex items-center space-x-2 mb-1">
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  </div>
                )}
                
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    message.senderId === 'current'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {message.type === 'text' ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <img
                      src={message.content}
                      alt="Shared image"
                      className="rounded-lg max-w-full h-auto"
                    />
                  )}
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <Button variant="icon" startIcon={<Smile className="h-5 w-5" />} />
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <Button variant="icon" startIcon={<Paperclip className="h-5 w-5" />} />
            <Button variant="icon" startIcon={<Mic className="h-5 w-5" />} />
            <Button
              variant="secondary"
              startIcon={<Send className="h-5 w-5" />}
              onClick={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;