import { useState, useEffect } from 'react';
import { FamilyTree } from '../types/family';
import { saveGoogleSheetValues } from '../lib/googleAuth';
import { treeToKeyValueRows } from '../lib/serializer';

export const useGoogleSync = (tree: FamilyTree) => {
  const [connectedSheet, setConnectedSheet] = useState<{ id: string; name: string } | null>(() => {
    const saved = localStorage.getItem('bonsho_connected_sheet');
    return saved ? JSON.parse(saved) : null;
  });

  const [accessToken, setAccessToken] = useState<string>(() => localStorage.getItem('bonsho_access_token') || '');
  const [lastSyncedTree, setLastSyncedTree] = useState<string>(() => localStorage.getItem('bonsho_last_synced_tree') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync to LocalStorage for persistence
  useEffect(() => {
    if (accessToken) localStorage.setItem('bonsho_access_token', accessToken);
    else localStorage.removeItem('bonsho_access_token');
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
      setLastSyncedTree(JSON.stringify(tree));
    }
  }, []);

  // Derived state for unsaved changes
  const currentTreeStr = JSON.stringify(tree);
  const hasUnsavedChanges = connectedSheet && lastSyncedTree && currentTreeStr !== lastSyncedTree;

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
      const rows = treeToKeyValueRows(tree);
      await saveGoogleSheetValues(connectedSheet.id, accessToken, rows);
      setLastSyncedTree(currentTreeStr);
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

  const markAsSynced = (explicitTree?: FamilyTree) => {
    setLastSyncedTree(explicitTree ? JSON.stringify(explicitTree) : currentTreeStr);
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
