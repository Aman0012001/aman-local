"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    connected: false
});

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 
    (process.env.NEXT_PUBLIC_API_URL 
        ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') 
        : 'http://127.0.0.1:3001');

// Append the namespace required by the backend gateway
const NAMESPACED_SOCKET_URL = `${SOCKET_URL.endsWith('/') ? SOCKET_URL.slice(0, -1) : SOCKET_URL}/notifications`;

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Only connect if user is logged in
        if (!user) {
            console.log('[SocketContext] No user found, disconnecting if needed');
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setConnected(false);
            }
            return;
        }

        console.log('[SocketContext] User logged in:', user.email, 'Checking token...');
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('[SocketContext] No token found in localStorage');
            return;
        }

        console.log('[SocketContext] Attempting connection to:', NAMESPACED_SOCKET_URL);
        
        // Use 127.0.0.1 instead of localhost if needed to bypass IPv6 resolution issues in some browsers
        const connectionUrl = NAMESPACED_SOCKET_URL.replace('localhost', '127.0.0.1');

        const newSocket = io(connectionUrl, {
            auth: { token: `Bearer ${token}` },
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000, // 20s timeout
        });

        newSocket.on('connect', () => {
            console.log('[SocketContext] Connection established. Socket ID:', newSocket.id);
            setConnected(true);

            console.log('[SocketContext] Sending authenticate event...');
            newSocket.emit('authenticate', (response: any) => {
                console.log('[SocketContext] Authentication callback received:', response);
            });
        });

        newSocket.on('disconnect', () => {
            console.log('[SocketContext] Disconnected from socket server');
            setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('[SocketContext] Connection error details:', {
                message: error.message,
                description: (error as any).description,
                context: (error as any).context,
                type: error.name
            });
            setConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
