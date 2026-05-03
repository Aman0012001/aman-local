"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageSquare, Loader2 } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

interface ChatWindowProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    businessName: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose, businessId, businessName }) => {
    const { user } = useAuth();
    const [conversation, setConversation] = useState<any | null>(null);
    const conversationId = conversation?.id;
    const { messages, isLoading, isTyping, sendMessage, sendTyping } = useChat(conversationId || undefined);
    const { socket: notificationSocket } = useNotifications();
    const [vendorOnline, setVendorOnline] = useState(false);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Initialize/Get conversation
    useEffect(() => {
        if (isOpen && businessId && !conversation) {
            import('../../services/chat.service').then(({ chatApi }) => {
                chatApi.getOrCreateConversation(businessId).then((conv: any) => {
                    setConversation(conv);
                    setVendorOnline(conv.vendor?.user?.isOnline || false);
                });
            });
        }
    }, [isOpen, businessId, conversation]);

    // Real-time online status
    useEffect(() => {
        if (!notificationSocket || !conversation?.vendor?.userId) return;

        const vendorUserId = conversation.vendor.userId;

        const onUserOnline = ({ userId }: { userId: string }) => {
            if (userId === vendorUserId) setVendorOnline(true);
        };

        const onUserOffline = ({ userId }: { userId: string }) => {
            if (userId === vendorUserId) setVendorOnline(false);
        };

        notificationSocket.on('userOnline', onUserOnline);
        notificationSocket.on('userOffline', onUserOffline);

        return () => {
            notificationSocket.off('userOnline', onUserOnline);
            notificationSocket.off('userOffline', onUserOffline);
        };
    }, [notificationSocket, conversation]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current;
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isTyping]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;
        sendMessage(input.trim());
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

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-20 md:bottom-24 right-4 left-4 md:left-auto md:right-6 w-auto md:w-96 h-[550px] max-h-[calc(100vh-120px)] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/10 flex flex-col z-[9999] overflow-hidden"
                >
                    {/* Premium Header */}
                    <div className="relative p-5 bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-between shadow-lg">
                        <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] pointer-events-none" />
                        <div className="relative flex items-center gap-4">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner overflow-hidden">
                                    <MessageSquare className="w-6 h-6 text-white" />
                                </div>
                                {vendorOnline && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-primary ring-2 ring-emerald-500/20 animate-pulse" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-base leading-tight tracking-tight line-clamp-1">{businessName}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className={`w-2 h-2 rounded-full ${vendorOnline ? 'bg-emerald-400' : 'bg-white/30'}`} />
                                    <p className="text-[11px] text-white/80 font-semibold tracking-wide uppercase">
                                        {vendorOnline ? 'Always Online' : 'Currently Offline'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="relative p-2 hover:bg-white/20 rounded-xl transition-all active:scale-90 group"
                        >
                            <X className="w-5 h-5 text-white/90 group-hover:text-white" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50 dark:bg-slate-900/30 scroll-smooth custom-scrollbar"
                    >
                        {isLoading && messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="relative">
                                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-20 h-20 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl flex items-center justify-center transform rotate-3"
                                >
                                    <MessageSquare className="w-10 h-10 text-primary/30" />
                                </motion.div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-extrabold text-slate-800 dark:text-white">Start the conversation</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-4">
                                        Connect with <span className="font-bold text-primary">{businessName}</span> directly. Ask about services, pricing, or availability.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg: any, idx: number) => {
                                const isMe = msg.senderId === user?.id;
                                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                const showAvatar = !isMe && (!prevMsg || prevMsg.senderId === user?.id);

                                return (
                                    <motion.div
                                        key={msg.id || idx}
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {!isMe && (
                                            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-300/50 dark:border-slate-700/50 shadow-sm">
                                                {showAvatar ? (
                                                    <span className="text-[10px] font-bold text-slate-500">{businessName.charAt(0)}</span>
                                                ) : null}
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-1">
                                            <div className={`max-w-[240px] px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                                isMe 
                                                    ? 'bg-gradient-to-br from-primary to-indigo-600 text-white rounded-br-none font-medium' 
                                                    : 'bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 rounded-bl-none'
                                            }`}>
                                                {msg.content}
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isMe ? 'text-right text-slate-400' : 'text-slate-400'}`}>
                                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                        {isTyping && (
                            <div className="flex justify-start pl-10">
                                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-2 px-3 rounded-2xl border border-white/20 dark:border-white/10 shadow-sm flex gap-1.5 items-center">
                                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Premium Input Unit */}
                    <div className="p-5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50">
                        <div className="relative group transition-all duration-300">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-[20px] blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                            <div className="relative flex items-center bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-[18px] shadow-sm focus-within:border-primary/50 overflow-hidden ring-0 transition-all">
                                <textarea
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        sendTyping();
                                    }}
                                    onKeyDown={handleKeyPress}
                                    placeholder="Write a message..."
                                    className="w-full bg-transparent border-none focus:ring-0 py-4 px-5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 resize-none max-h-32 min-h-[56px] custom-scrollbar"
                                    rows={1}
                                />
                                <div className="px-3">
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={!input.trim()}
                                        className="w-10 h-10 flex items-center justify-center bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-30 disabled:grayscale transition-all active:scale-90 shadow-lg shadow-primary/20"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ChatWindow;
