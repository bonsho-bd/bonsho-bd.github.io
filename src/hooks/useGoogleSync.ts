import { useState, useEffect } from 'react';
import { FamilyGraph } from '../types/family';
import { saveGoogleSheetValues } from '../lib/googleAuth';
import { graphToKeyValueRows } from '../lib/serializer';

export const useGoogleSync = (graph: FamilyGraph) => {
  const [connectedSheet, setConnectedSheet] = useState<{ id: string; name: string } | null>(() => {
    const saved = localStorage.getItem('bonsho_connected_sheet');
    return saved ? JSON.parse(saved) : null;
  });

  const [accessToken, setAccessToken] = useState<string>(() => {
    const token = localStorage.getItem('bonsho_access_token');
    const expiresAt = localStorage.getItem('bonsho_access_token_expires_at');
    if (token && expiresAt && Date.now() < parseInt(expiresAt, 10)) {
      return token;
    }
    // Token expired or not found
    localStorage.removeItem('bonsho_access_token');
    localStorage.removeItem('bonsho_access_token_expires_at');
    return '';
  });

  const [lastSyncedTree, setLastSyncedTree] = useState<string>(() => localStorage.getItem('bonsho_last_synced_tree') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync to LocalStorage for persistence & auto-logout
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('bonsho_access_token', accessToken);
      // Only set expiration if it doesn't exist, to prevent resetting the timer on re-renders
      if (!localStorage.getItem('bonsho_access_token_expires_at')) {
        // Google tokens typically last 1 hour (3600 seconds). Expire at 55 minutes to be safe.
        localStorage.setItem('bonsho_access_token_expires_at', (Date.now() + 55 * 60 * 1000).toString());
      }
    } else {
      localStorage.removeItem('bonsho_access_token');
      localStorage.removeItem('bonsho_access_token_expires_at');
    }
  }, [accessToken]);

  // Periodic check to auto-logout if token expires while app is open
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(() => {
      const expiresAt = localStorage.getItem('bonsho_access_token_expires_at');
      if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
        setAccessToken(''); // Auto logout
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [accessToken]);

  useEffect(() => {
    if (connectedSheet) localStorage.setItem('bonsho_connected_sheet', JSON.stringify(connectedSheet));
    else localStorage.removeItem('bonsho_connected_sheet');
  }, [connectedSheet]);

  useEffect(() => {
    if (lastSyncedTree) localStorage.setItem('bonsho_last_synced_tree', lastSyncedTree);
  }, [lastSyncedTree]);

  // Make sure lastSyncedTree is initialized properly
  useEffect(() => {
    if (!lastSyncedTree) {
      setLastSyncedTree(JSON.stringify(graph));
    }
  }, []);

  // Derived state for unsaved changes
  const currentGraphStr = JSON.stringify(graph);
  const hasUnsavedChanges = connectedSheet && lastSyncedTree && currentGraphStr !== lastSyncedTree;

  // Unload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleQuickSync = async () => {
    if (!connectedSheet || !accessToken) return;
    try {
      setIsSyncing(true);
      setSyncError(null);
      const rows = graphToKeyValueRows(graph);
      await saveGoogleSheetValues(connectedSheet.id, accessToken, rows);
      setLastSyncedTree(currentGraphStr);
      // Removed native alert: The UI naturally dismissing itself is the success indicator.
    } catch (err: any) {
      setSyncError(err.message);
      if (err.message && err.message.includes('Session Expired')) {
        setAccessToken('');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectSheet = () => {
    setConnectedSheet(null);
  };

  const markAsSynced = (explicitTree?: FamilyGraph) => {
    setLastSyncedTree(explicitTree ? JSON.stringify(explicitTree) : currentGraphStr);
  };

  return {
    connectedSheet,
    setConnectedSheet,
    accessToken,
    setAccessToken,
    lastSyncedTree,
    setLastSyncedTree,
    isSyncing,
    hasUnsavedChanges,
    syncError,
    handleQuickSync,
    disconnectSheet,
    markAsSynced
  };
};
