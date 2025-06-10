'use client';

import React, { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './index';
import { hydrateAuth } from './authSlice';
import { api } from '@/lib/api'; 

export default function StoreProvider({ children }: { children: React.ReactNode }) {
    const storeRef = useRef(store); 

    useEffect(() => {
        storeRef.current.dispatch(hydrateAuth());
        const currentToken = storeRef.current.getState().auth.token;
        if (currentToken) {
            api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
        }

    }, []);

    return <Provider store={storeRef.current}>{children}</Provider>;
}