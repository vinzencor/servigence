import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Paperclip,
  Mic,
  MicOff,
  Play,
  Pause,
  Download,
  Search,
  Users,
  MoreVertical,
  ArrowLeft,
  FileText,
  Image,
  File
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { dbHelpers } from '../lib/supabase';
import { ChatConversation, ChatMessage, ServiceEmployee } from '../types';
import VoiceRecorder from './VoiceRecorder';

const Chat: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<ServiceEmployee[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmployeeList, setShowEmployeeList] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEmployees();
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Refresh conversations periodically to get new messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.service_employee_id) {
        loadConversations();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [user?.service_employee_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadEmployees = async () => {
    try {
      const employeesData = await dbHelpers.getServiceEmployees();
      // Filter out current user
      const filteredEmployees = employeesData.filter((emp: ServiceEmployee) => emp.id !== user?.service_employee_id);
      setEmployees(filteredEmployees || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadConversations = async () => {
    if (!user?.service_employee_id) {
      console.warn('No service_employee_id found for user:', user);
      return;
    }

    try {
      setLoading(true);
      const conversationsData = await dbHelpers.getConversations(user.service_employee_id);
      setConversations(conversationsData || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const messagesData = await dbHelpers.getMessages(conversationId);
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!user?.service_employee_id) return;

    try {
      await dbHelpers.markMessagesAsRead(conversationId, user.service_employee_id);
      // Refresh conversations to update unread counts
      await loadConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startConversation = async (employee: ServiceEmployee) => {
    if (!user?.service_employee_id) return;

    try {
      const conversation = await dbHelpers.getOrCreateConversation(
        user.service_employee_id,
        employee.id
      );

      // Add employee info to conversation for display
      const conversationWithEmployee = {
        ...conversation,
        participant_1: user.service_employee_id === conversation.participant_1_id ?
          { id: user.service_employee_id, name: user.name, email: user.email } : employee,
        participant_2: user.service_employee_id === conversation.participant_2_id ?
          { id: user.service_employee_id, name: user.name, email: user.email } : employee,
        unread_count: 0 // Reset unread count when starting new conversation
      };

      setSelectedConversation(conversationWithEmployee);
      setShowEmployeeList(false);

      // Refresh conversations list
      await loadConversations();
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const selectExistingConversation = async (conversation: ChatConversation) => {
    // Mark messages as read before selecting
    if (conversation.unread_count && conversation.unread_count > 0) {
      await markAsRead(conversation.id);
    }

    // Update the selected conversation with cleared unread count
    const updatedConversation = {
      ...conversation,
      unread_count: 0
    };

    setSelectedConversation(updatedConversation);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.service_employee_id) return;

    try {
      const messageData = {
        conversation_id: selectedConversation.id,
        sender_id: user.service_employee_id,
        message_type: 'text',
        content: newMessage.trim(),
        is_read: false
      };

      const sentMessage = await dbHelpers.sendMessage(messageData);
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');

      // Refresh conversations to update last message and move to top
      setTimeout(() => {
        loadConversations();
      }, 100); // Small delay to ensure message is saved
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation || !user?.service_employee_id) return;

    try {
      // In a real implementation, you would upload the file to storage first
      // For now, we'll simulate file upload
      const messageData = {
        conversation_id: selectedConversation.id,
        sender_id: user.service_employee_id,
        message_type: 'document',
        content: `Shared a file: ${file.name}`,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        is_read: false
      };

      const sentMessage = await dbHelpers.sendMessage(messageData);
      setMessages(prev => [...prev, sentMessage]);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh conversations to update last message
      setTimeout(() => {
        loadConversations();
      }, 100);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob, duration: number) => {
    if (!selectedConversation || !user?.service_employee_id) return;

    try {
      // In a real implementation, you would upload the audio file to storage first
      // For now, we'll simulate voice message
      const messageData = {
        conversation_id: selectedConversation.id,
        sender_id: user.service_employee_id,
        message_type: 'voice',
        content: 'Voice message',
        voice_duration: duration,
        file_size: audioBlob.size,
        file_type: 'audio/webm',
        is_read: false
      };

      const sentMessage = await dbHelpers.sendMessage(messageData);
      setMessages(prev => [...prev, sentMessage]);

      // Refresh conversations to update last message
      setTimeout(() => {
        loadConversations();
      }, 100);
    } catch (error) {
      console.error('Error sending voice message:', error);
    }
  };

  const getOtherParticipant = (conversation: ChatConversation) => {
    if (!user?.service_employee_id) return null;
    
    return conversation.participant_1_id === user.service_employee_id
      ? conversation.participant_2
      : conversation.participant_1;
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const downloadFile = async (message: ChatMessage) => {
    try {
      // In a real implementation, you would download from your storage service
      // For now, we'll create a placeholder download
      if (message.file_name) {
        // Create a simple text file with message info for demonstration
        const content = `File: ${message.file_name}\nType: ${message.file_type}\nSize: ${message.file_size} bytes\nSent by: ${message.sender?.name}\nDate: ${new Date(message.created_at).toLocaleString()}\n\nNote: This is a placeholder file. In a real implementation, the actual file content would be downloaded from storage.`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = message.file_name || 'download.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success(`Downloaded: ${message.file_name}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  // Show error if user doesn't have a valid service employee ID
  if (!user?.service_employee_id) {
    return (
      <div className="h-[calc(100vh-120px)] bg-white rounded-xl border border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chat Unavailable</h3>
          <p className="text-gray-500">Your account is not linked to a service employee profile.</p>
          <p className="text-gray-500">Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] bg-white rounded-xl border border-gray-200 flex">
      {/* Sidebar - Employee List and Conversations */}
      <div className={`${showEmployeeList ? 'w-80' : 'w-80'} border-r border-gray-200 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
            <button
              onClick={() => setShowEmployeeList(!showEmployeeList)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Employee List or Conversations */}
        <div className="flex-1 overflow-y-auto">
          {showEmployeeList ? (
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2 px-2">Start New Chat</h3>
              {filteredEmployees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => startConversation(employee)}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {employee.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{employee.name}</p>
                    <p className="text-sm text-gray-500 truncate">{employee.department}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2 px-2">Recent Chats</h3>
              {conversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                if (!otherParticipant) return null;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => selectExistingConversation(conversation)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left relative ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {otherParticipant.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium truncate ${
                          conversation.unread_count && conversation.unread_count > 0
                            ? 'text-gray-900 font-semibold'
                            : 'text-gray-900'
                        }`}>
                          {otherParticipant.name}
                        </p>
                        {conversation.unread_count && conversation.unread_count > 0 && (
                          <div className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </div>
                        )}
                      </div>
                      <p className={`text-sm truncate ${
                        conversation.unread_count && conversation.unread_count > 0
                          ? 'text-gray-700 font-medium'
                          : 'text-gray-500'
                      }`}>
                        {conversation.last_message?.content || 'No messages yet'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 flex flex-col items-end">
                      {conversation.last_message_at && formatTime(conversation.last_message_at)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {(() => {
                  const otherParticipant = getOtherParticipant(selectedConversation);
                  return otherParticipant ? (
                    <>
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {otherParticipant.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{otherParticipant.name}</h3>
                        <p className="text-sm text-gray-500">Online</p>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.service_employee_id;
                const showDate = index === 0 ||
                  formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="text-center my-4">
                        <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                    )}

                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                        {!isOwnMessage && (
                          <p className="text-xs text-gray-500 mb-1 ml-2">
                            {message.sender?.name}
                          </p>
                        )}

                        <div className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          {message.message_type === 'text' && (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}

                          {message.message_type === 'document' && (
                            <div className="flex items-center space-x-2">
                              {getFileIcon(message.file_type || '')}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.file_name}</p>
                                <p className="text-xs opacity-75">
                                  {message.file_size && (message.file_size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <button
                                onClick={() => downloadFile(message)}
                                className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
                                title="Download file"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {message.message_type === 'voice' && (
                            <div className="flex items-center space-x-2">
                              <button className="p-1 hover:bg-black hover:bg-opacity-10 rounded">
                                <Play className="w-4 h-4" />
                              </button>
                              <div className="flex-1 h-1 bg-black bg-opacity-20 rounded-full">
                                <div className="h-full w-1/3 bg-white rounded-full"></div>
                              </div>
                              <span className="text-xs opacity-75">
                                {message.voice_duration}s
                              </span>
                            </div>
                          )}
                        </div>

                        <p className={`text-xs text-gray-500 mt-1 ${
                          isOwnMessage ? 'text-right mr-2' : 'ml-2'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-end space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>

                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={`p-2 rounded-lg transition-colors ${
                    isRecording
                      ? 'bg-red-500 text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose an employee to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Voice Recorder */}
      {selectedConversation && (
        <VoiceRecorder
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={() => setIsRecording(false)}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
        />
      )}
    </div>
  );
};

export default Chat;
