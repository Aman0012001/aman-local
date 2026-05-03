"use client";

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatWindow from './ChatWindow';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export interface ChatTriggerHandle {
    open: () => void;
}

interface ChatTriggerProps {
    businessId: string;
    businessName: string;
    variant?: 'button' | 'icon' | 'full';
    className?: string;
    label?: string;
    icon?: React.ReactNode;
}

const ChatTrigger = forwardRef<ChatTriggerHandle, ChatTriggerProps>(({ 
    businessId, 
    businessName, 
    variant = 'button', 
    className = '',
    label = 'Chat',
    icon
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    useImperativeHandle(ref, () => ({
        open: () => {
            if (!user) {
                router.push(`/login?redirect=/business/${businessId}`);
                return;
            }
            api.leads.createLead({
                businessId,
                name: user.fullName || "User",
                email: user.email || "",
                message: `User initiated ${label} via Chat`,
                type: 'chat',
                source: 'chat-trigger'
            }).catch(err => console.error("Failed to create chat lead:", err));
            
            setIsOpen(true);
        }
    }));

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!user) {
            router.push(`/login?redirect=/business/${businessId}`);
            return;
        }
        
        if (!isOpen) {
            api.leads.createLead({
                businessId,
                name: user.fullName || "User",
                email: user.email || "",
                message: `User initiated ${label} via Chat button`,
                type: 'chat',
                source: 'chat-button'
            }).catch(err => console.error("Failed to create chat lead:", err));
        }
        
        setIsOpen(!isOpen);
    };

    return (
        <>
            {variant === 'icon' ? (
                <button
                    onClick={handleToggle}
                    className={`p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary active:scale-95 relative z-[9998] ${className}`}
                    title="Live Chat"
                >
                    <MessageCircle className="w-5 h-5" />
                </button>
            ) : (
                <button
                    onClick={handleToggle}
                    className={variant === 'full' 
                        ? `w-full flex items-center justify-center gap-2 font-black py-4 rounded-[10px] transition-all relative z-[9998] ${className}`
                        : `btn-orbit-secondary bg-primary/5 border-primary/10 text-primary rounded-[12px] h-[42px] px-4 flex items-center gap-2 relative z-[9998] ${className}`
                    }
                >
                    {icon || <MessageCircle className="w-4 h-4" />}
                    <span>{label}</span>
                </button>
            )}

            <ChatWindow
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                businessId={businessId}
                businessName={businessName}
            />
        </>
    );
});

ChatTrigger.displayName = 'ChatTrigger';

export default ChatTrigger;
