"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Search, Send, User, ChevronRight, Loader2, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { chatApi } from '../../../services/chat.service';
import { useChat, useChatSocket } from '../../../hooks/useChat';
import { useNotifications } from '../../../hooks/useNotifications';
import { getImageUrl } from '../../../lib/api';
import Link from 'next/link';

export default function VendorChatDashboard() {
    const { user } = useAuth();
    const isVendor = user?.role === 'vendor';
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const activeSub = user?.vendor?.subscriptions?.find((sub: any) => sub.status === 'active');
    const features = activeSub?.plan?.dashboardFeatures || {};

    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const currentConv = conversations.find(c => c.id === selectedConvId);
    const { messages, isLoading: messagesLoading, sendMessage, sendTyping, isTyping } = useChat(selectedConvId || undefined);
    const { socket } = useChatSocket();
    const { socket: notificationSocket } = useNotifications();
    const [input, setInput] = useState('');
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const fetchConversations = useCallback(async () => {
        try {
            let data: any[] = [];
            if (isVendor || isAdmin) {
                data = await chatApi.getVendorConversations() as any[];
            } else {
                data = await chatApi.getUserConversations() as any[];
            }
            setConversations(data);
            if (data.length > 0 && !selectedConvId) {
                setSelectedConvId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedConvId, isVendor, isAdmin]);

    // Initial fetch
    useEffect(() => {
        fetchConversations();
    }, []); // Only on mount — real-time updates handled by socket

    // Real-time: listen for new conversations and message updates
    useEffect(() => {
        if (!socket) return;

        const onNewConversation = (conv: any) => {
            setConversations(prev => {
                // Avoid duplicates
                if (prev.some(c => c.id === conv.id)) return prev;
                return [conv, ...prev];
            });
        };

        const onConversationUpdated = (update: any) => {
            setConversations(prev => {
                const updated = prev.map(c =>
                    c.id === update.conversationId
                        ? { ...c, lastMessage: update.lastMessage, lastMessageAt: update.lastMessageAt }
                        : c
                );
                // Move updated conversation to top
                const idx = updated.findIndex(c => c.id === update.conversationId);
                if (idx > 0) {
                    const [conv] = updated.splice(idx, 1);
                    return [conv, ...updated];
                }
                return updated;
            });
        };

        socket.on('newConversation', onNewConversation);
        socket.on('conversationUpdated', onConversationUpdated);

        return () => {
            socket.off('newConversation', onNewConversation);
            socket.off('conversationUpdated', onConversationUpdated);
        };
    }, [socket]);

    // Real-time: listen for online status updates
    useEffect(() => {
        if (!notificationSocket) return;

        const onUserOnline = ({ userId }: { userId: string }) => {
            setConversations(prev => prev.map(c => 
                c.userId === userId ? { ...c, user: { ...c.user, isOnline: true } } : c
            ));
        };

        const onUserOffline = ({ userId }: { userId: string }) => {
            setConversations(prev => prev.map(c => 
                c.userId === userId ? { ...c, user: { ...c.user, isOnline: false } } : c
            ));
        };

        notificationSocket.on('userOnline', onUserOnline);
        notificationSocket.on('userOffline', onUserOffline);

        return () => {
            notificationSocket.off('userOnline', onUserOnline);
            notificationSocket.off('userOffline', onUserOffline);
        };
    }, [notificationSocket]);

    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current;
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else {
            sendTyping();
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.business?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
            <div className="flex-1 flex w-full gap-6 overflow-hidden">
                {/* Desktop Sidebar / Conversation List */}
                <div className={`flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${selectedConvId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96`}>
                    <div className="p-6 border-b border-slate-100 bg-white">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Messages</h2>
                            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                {conversations.length} Active
                            </div>
                        </div>

                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder={isVendor ? "Search customers..." : "Search businesses..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {filteredConversations.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-slate-300" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">No messages found</p>
                                    <p className="text-xs text-slate-400">
                                        {isVendor ? "New customer inquiries will appear here." : "Start talking to businesses to see chats here."}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConvId(conv.id)}
                                    className={`w-full text-left p-4 rounded-[20px] transition-all flex items-center gap-4 group ${selectedConvId === conv.id
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 ring-4 ring-primary/5'
                                            : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                                        }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                                            {isVendor ? (
                                                conv.user?.avatarUrl ? (
                                                    <img src={getImageUrl(conv.user.avatarUrl) as string} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                )
                                            ) : (
                                                conv.business?.logoUrl ? (
                                                    <img src={getImageUrl(conv.business.logoUrl) as string} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-600 font-black text-xs">
                                                        {(conv.business?.title?.[0] || 'B').toUpperCase()}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                        {conv.user?.isOnline && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h4 className={`font-black text-sm truncate ${selectedConvId === conv.id ? 'text-white' : 'text-slate-900'}`}>
                                                {isVendor ? (conv.user?.fullName || 'Anonymous') : (conv.business?.title || 'Business')}
                                            </h4>
                                            <span className={`text-[10px] font-bold ${selectedConvId === conv.id ? 'text-white/70' : 'text-slate-400'}`}>
                                                {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                        <p className={`text-xs font-medium line-clamp-1 ${selectedConvId === conv.id ? 'text-white/80' : 'text-slate-500'}`}>
                                            {conv.lastMessage || 'No messages yet'}
                                        </p>
                                        <div className={`mt-1 text-[9px] font-black uppercase tracking-widest ${selectedConvId === conv.id ? 'text-white/60' : 'text-primary'}`}>
                                            {isVendor ? conv.business?.title : 'Customer Service'}
                                        </div>
                                    </div>
                                    {selectedConvId !== conv.id && (
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={`flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
                    {selectedConvId ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 md:p-6 border-b border-slate-100 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setSelectedConvId(null)}
                                        className="md:hidden p-2 hover:bg-slate-50 rounded-xl transition-colors"
                                    >
                                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                                    </button>
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 overflow-hidden border-2 border-slate-50 shadow-sm">
                                        {isVendor ? (
                                            currentConv?.user?.avatarUrl ? (
                                                <img src={getImageUrl(currentConv.user.avatarUrl) as string} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <User className="w-6 h-6" />
                                                </div>
                                            )
                                        ) : (
                                            currentConv?.business?.logoUrl ? (
                                                <img src={getImageUrl(currentConv.business.logoUrl) as string} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-600 font-black text-xs">
                                                    {(currentConv?.business?.title?.[0] || 'B').toUpperCase()}
                                                </div>
                                            )
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                                            {isVendor ? (currentConv?.user?.fullName || 'Anonymous Customer') : (currentConv?.business?.title || 'Business')}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regarding</span>
                                            <Link href={`/business/${currentConv?.business?.slug}`} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                                                {currentConv?.business?.title}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-3">
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${currentConv?.user?.isOnline
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-slate-50 text-slate-400 border-slate-100'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${currentConv?.user?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                        {currentConv?.user?.isOnline ? 'Online' : 'Offline'}
                                    </div>
                                </div>
                            </div>

                            {/* Messages Container */}
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar"
                            >
                                {messagesLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isMe = msg.senderId === user?.id;
                                        return (
                                            <motion.div
                                                key={msg.id || idx}
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className="flex flex-col gap-1.5 max-w-[80%] md:max-w-[70%]">
                                                    <div className={`p-4 rounded-[20px] text-sm font-medium shadow-sm transition-all ${isMe
                                                            ? 'bg-primary text-white rounded-tr-none shadow-primary/20 hover:shadow-primary/30'
                                                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 hover:border-slate-200'
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border border-slate-100 p-3 px-4 rounded-full shadow-sm flex gap-1.5 items-center">
                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-6 bg-white border-t border-slate-100">
                                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 pl-6 rounded-[2rem] focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/40 transition-all">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Type your response..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 py-2 h-10 resize-none"
                                        rows={1}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim()}
                                        className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg shadow-primary/20"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Shift + Enter for new line
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Instant Response System
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/30">
                            <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-slate-200 border border-slate-100">
                                <MessageSquare className="w-12 h-12 text-primary" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Customer Connect</h3>
                            <p className="text-slate-500 font-medium max-w-sm leading-relaxed mb-8">
                                Select a conversation to start chatting with your potential customers in real-time.
                            </p>
                            <div className="flex items-center gap-6 p-1 bg-slate-100/50 rounded-2xl border border-slate-200">
                                <div className="flex flex-col items-center px-4 py-2">
                                    <span className="text-xl font-black text-slate-900 leading-none">{conversations.length}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Threads</span>
                                </div>
                                <div className="w-px h-8 bg-slate-200" />
                                <div className="flex flex-col items-center px-4 py-2">
                                    <span className="text-xl font-black text-slate-900 leading-none">
                                        {conversations.reduce((acc, c) => acc + (c.messages?.length || 0), 0)}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Msgs</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
