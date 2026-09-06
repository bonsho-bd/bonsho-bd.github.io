import { useState, useEffect, useCallback } from 'react';
import { Person, FamilyTree } from '../types/family';

interface AddRelativeState {
  isOpen: boolean;
  mode: 'child' | 'spouse' | 'person';
  person: Person | null;
}

interface NavigateParams {
  person?: string | null;
  edit?: string | null;
  add?: 'child' | 'spouse' | 'person' | null;
  target?: string | null; // ID of the person we're adding a relative to
  modal?: 'clipboard' | 'google' | 'qr' | null;
}

export const useAppNavigation = (tree: FamilyTree) => {
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [addRelativeState, setAddRelativeState] = useState<AddRelativeState>({
    isOpen: false,
    mode: 'child',
    person: null,
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(window.location.search).get('q') || '';
  });
  const [modalDepth, setModalDepth] = useState<number>(() => (window.history.state?.modalDepth as number) || 0);

  // Sync with selectedPerson when tree updates
  useEffect(() => {
    if (selectedPerson) {
      setSelectedPerson(tree.people[selectedPerson.id] || null);
    }
  }, [tree]);

  const navigateTo = useCallback((params: NavigateParams, replace = false, currentTree: FamilyTree = tree) => {
    // Determine new states based on params
    const nextSelected = params.person ? currentTree.people[params.person] || null : null;
    const nextEditing = params.edit ? currentTree.people[params.edit] || null : null;

    let nextAddState: AddRelativeState = { isOpen: false, mode: 'child', person: null };
    if (params.add) {
      if (params.add === 'person') {
        nextAddState = { isOpen: true, mode: 'person', person: null };
      } else if (params.target && currentTree.people[params.target]) {
        nextAddState = { isOpen: true, mode: params.add, person: currentTree.people[params.target] };
      }
    }

    const nextPaste = params.modal === 'clipboard';
    const nextGoogle = params.modal === 'google';
    const nextQR = params.modal === 'qr';

    // Update States
    setSelectedPerson(nextSelected);
    setEditingPerson(nextEditing);
    setAddRelativeState(nextAddState);
    setIsPasteModalOpen(nextPaste);
    setIsGoogleModalOpen(nextGoogle);
    setIsQRModalOpen(nextQR);

    // Any modal open?
    const isAnyModalOpen = nextSelected || nextEditing || nextAddState.isOpen || nextPaste || nextGoogle || nextQR;

    // Build URL (preserve QR view routes so they are never destroyed)
    const url = new URL(window.location.href);
    const isQRViewRoute = url.hash.includes('view/qr-v0/');

    if (params.person) {
      if (!isQRViewRoute) {
        url.hash = `#person-${encodeURIComponent(params.person)}`;
      } else {
        url.searchParams.set('person', params.person);
      }
    } else {
      if (!isQRViewRoute) {
        url.hash = '';
      } else {
        url.searchParams.delete('person');
      }
    }

    const newDepth = isAnyModalOpen ? modalDepth + 1 : 0;
    setModalDepth(newDepth);

    if (replace) {
      window.history.replaceState({ modalDepth: newDepth }, '', url.toString());
    } else {
      window.history.pushState({ modalDepth: newDepth }, '', url.toString());
    }
  }, [modalDepth, tree]);

  const closeActiveModal = useCallback(() => {
    if (modalDepth > 0) {
      window.history.back();
    } else {
      navigateTo({});
    }
  }, [modalDepth, navigateTo]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const stateDepth = (e.state?.modalDepth as number) || 0;
      setModalDepth(stateDepth);

      if (stateDepth === 0) {
        setSelectedPerson(null);
        setEditingPerson(null);
        setAddRelativeState({ isOpen: false, mode: 'child', person: null });
        setIsPasteModalOpen(false);
        setIsGoogleModalOpen(false);
        setIsQRModalOpen(false);
        return;
      }

      // Restore state from hash or search param
      const hash = window.location.hash;
      const searchPerson = new URLSearchParams(window.location.search).get('person');

      if (hash.startsWith('#person-')) {
        const id = decodeURIComponent(hash.replace('#person-', ''));
        setSelectedPerson(tree.people[id] || null);
        setEditingPerson(null);
        setAddRelativeState({ isOpen: false, mode: 'child', person: null });
        setIsPasteModalOpen(false);
        setIsGoogleModalOpen(false);
        setIsQRModalOpen(false);
      } else if (searchPerson && tree.people[searchPerson]) {
        setSelectedPerson(tree.people[searchPerson]);
        setEditingPerson(null);
        setAddRelativeState({ isOpen: false, mode: 'child', person: null });
        setIsPasteModalOpen(false);
        setIsGoogleModalOpen(false);
        setIsQRModalOpen(false);
      } else {
        // Reset without triggering another pushState
        setSelectedPerson(null);
        setEditingPerson(null);
        setAddRelativeState({ isOpen: false, mode: 'child', person: null });
        setIsPasteModalOpen(false);
        setIsGoogleModalOpen(false);
        setIsQRModalOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [tree]);

  return {
    isPasteModalOpen,
    isGoogleModalOpen,
    isQRModalOpen,
    selectedPerson,
    editingPerson,
    addRelativeState,
    searchQuery,
    setSearchQuery,
    modalDepth,
    navigateTo,
    closeActiveModal,
    setSelectedPerson
  };
};
