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

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '') : 'http://localhost:3001');

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

        console.log('[SocketContext] Attempting connection to:', SOCKET_URL);

        const newSocket = io(SOCKET_URL, {
            auth: { token: `Bearer ${token}` },
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
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
            console.error('[SocketContext] Connection error:', error);
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
