import React, { useState, useEffect, useRef } from 'react';
import { FamilyTree, Person, Gender } from './types/family';
import { parseRawText, parseKeyValueBlocksToTree } from './lib/parser';
import { downloadTreeAsExcel, downloadTreeAsCSV, treeToCSV } from './lib/serializer';
import { SAMPLE_FAMILY_TEXT } from './lib/sampleData';
import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { PasteModal } from './components/PasteModal';
import { PersonModal } from './components/PersonModal';
import { EditPersonModal } from './components/EditPersonModal';
import { AddRelativeModal } from './components/AddRelativeModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { QRCodeModal } from './components/QRCodeModal';
import { extractTreeFromCurrentUrl } from './lib/qrCodec';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { CloudUpload, AlertCircle, Loader2 } from 'lucide-react';
import { saveGoogleSheetValues } from './lib/googleAuth';
import { treeToKeyValueRows } from './lib/serializer';

const STORAGE_KEY = 'bonsho_family_tree_data';

export const App: React.FC = () => {
  // Tree state
  const [newPersonCoords, setNewPersonCoords] = useState<{x: number, y: number} | null>(null);
  const [tree, setTree] = useState<FamilyTree>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return parseRawText(saved);
      } catch (e) {
        console.error('Failed to load saved tree:', e);
      }
    }
    return parseRawText(SAMPLE_FAMILY_TEXT);
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(window.location.search).get('q') || '';
  });

  // Google Sheet connection state
  const [connectedSheet, setConnectedSheet] = useState<{ id: string; name: string } | null>(() => {
    const saved = localStorage.getItem('bonsho_connected_sheet');
    return saved ? JSON.parse(saved) : null;
  });
  const [accessToken, setAccessToken] = useState<string>(() => localStorage.getItem('bonsho_access_token') || '');
  const [lastSyncedTree, setLastSyncedTree] = useState<string>(() => localStorage.getItem('bonsho_last_synced_tree') || '');
  const [isSyncing, setIsSyncing] = useState(false);

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

  // Derived state for unsaved changes
  // We stringify the current tree to compare with last synced tree
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
      const rows = treeToKeyValueRows(tree);
      await saveGoogleSheetValues(connectedSheet.id, accessToken, rows);
      setLastSyncedTree(currentTreeStr);
      alert('সফলভাবে গুগল শিটে সেভ হয়েছে!');
    } catch (err: any) {
      alert('সেভ করতে সমস্যা হয়েছে: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Modals state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [addRelativeState, setAddRelativeState] = useState<{
    isOpen: boolean;
    person: Person | null;
    mode: 'child' | 'spouse' | 'person';
  }>({
    isOpen: false,
    person: null,
    mode: 'person',
  });

  const [modalDepth, setModalDepth] = useState<number>(() => (window.history.state?.modalDepth as number) || 0);
  const treeRef = useRef<FamilyTree>(tree);
  treeRef.current = tree;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize modal state with URL parameters
  const syncStateFromUrl = (currentTreeOverride?: FamilyTree) => {
    const currentTree = currentTreeOverride || treeRef.current;
    const params = new URLSearchParams(window.location.search);
    const personId = params.get('person');
    const editId = params.get('edit');
    const addMode = params.get('add') as 'child' | 'spouse' | 'person' | null;
    const targetId = params.get('target');
    const modalType = params.get('modal');
    const q = params.get('q');

    if (q !== null && q !== searchQuery) {
      setSearchQuery(q);
    }

    setIsPasteModalOpen(modalType === 'clipboard');
    setIsGoogleModalOpen(modalType === 'google');
    setIsQRModalOpen(modalType === 'qr');

    if (editId && currentTree.people[editId]) {
      setEditingPerson(currentTree.people[editId]);
    } else {
      setEditingPerson(null);
    }

    if (addMode === 'child' || addMode === 'spouse' || addMode === 'person') {
      const targetPerson = targetId ? (currentTree.people[targetId] || null) : null;
      setAddRelativeState({
        isOpen: true,
        mode: addMode,
        person: targetPerson,
      });
    } else {
      setAddRelativeState(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
    }

    if (personId && currentTree.people[personId]) {
      setSelectedPerson(currentTree.people[personId]);
    } else {
      setSelectedPerson(null);
    }

    const depth = (window.history.state?.modalDepth as number) || 0;
    setModalDepth(depth);
  };

  interface NavParams {
    person?: string | null;
    edit?: string | null;
    add?: 'child' | 'spouse' | 'person' | null;
    target?: string | null;
    modal?: 'clipboard' | 'google' | 'qr' | null;
  }

  const navigateTo = (nav: NavParams, replace = false, currentTreeOverride?: FamilyTree) => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q');

    url.searchParams.delete('person');
    url.searchParams.delete('edit');
    url.searchParams.delete('add');
    url.searchParams.delete('target');
    url.searchParams.delete('modal');

    if (q) url.searchParams.set('q', q);

    if (nav.person) url.searchParams.set('person', nav.person);
    if (nav.edit) url.searchParams.set('edit', nav.edit);
    if (nav.add) url.searchParams.set('add', nav.add);
    if (nav.target) url.searchParams.set('target', nav.target);
    if (nav.modal) url.searchParams.set('modal', nav.modal);

    const isModalOpen = Boolean(nav.person || nav.edit || nav.add || nav.modal);
    const prevDepth = (window.history.state?.modalDepth as number) || 0;
    const newDepth = isModalOpen ? (replace ? prevDepth : prevDepth + 1) : 0;

    const stateObj = { bonshoNav: true, modalDepth: newDepth };

    if (replace) {
      window.history.replaceState(stateObj, '', url.toString());
    } else {
      window.history.pushState(stateObj, '', url.toString());
    }

    setModalDepth(newDepth);
    syncStateFromUrl(currentTreeOverride || tree);
  };

  const closeActiveModal = () => {
    const depth = (window.history.state?.modalDepth as number) || 0;
    if (depth > 0) {
      window.history.back();
    } else {
      navigateTo({}, true);
    }
  };

  const handleClosePersonModal = () => {
    const depth = (window.history.state?.modalDepth as number) || 0;
    if (depth > 0) {
      window.history.go(-depth);
    } else {
      navigateTo({}, true);
    }
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    const url = new URL(window.location.href);
    if (q.trim()) {
      url.searchParams.set('q', q.trim());
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState(window.history.state, '', url.toString());
  };

  // Listen for browser back / forward navigation and load QR URL if present
  useEffect(() => {
    const handlePopState = () => {
      syncStateFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    syncStateFromUrl();

    // Check if the page was opened with a QR code view link (/view/qr-v0/<data>)
    const qrTree = extractTreeFromCurrentUrl();
    if (qrTree && Object.keys(qrTree.people).length > 0) {
      setTree(qrTree);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Sync with selectedPerson when tree updates
  useEffect(() => {
    if (selectedPerson) {
      setSelectedPerson(tree.people[selectedPerson.id] || null);
    }
  }, [tree]);

  // Handle Raw Text Parse (from Paste modal)
  const handleParseText = (rawText: string) => {
    try {
      const parsedTree = parseRawText(rawText);
      setTree(parsedTree);
      localStorage.setItem(STORAGE_KEY, rawText);
    } catch (err) {
      alert('তথ্য পার্স করতে সমস্যা হয়েছে। অনুগ্রহ করে ফরম্যাট যাচাই করুন।');
      console.error(err);
    }
  };

  // Load Sample Family Tree
  const handleLoadSample = () => {
    const sampleTree = parseRawText(SAMPLE_FAMILY_TEXT);
    setTree(sampleTree);
    localStorage.setItem(STORAGE_KEY, SAMPLE_FAMILY_TEXT);
    navigateTo({}, true, sampleTree);
  };

  // Start a new blank family (empty tree)
  const handleNewTree = () => {
    if (confirm('আপনি কি সম্পূর্ণ নতুন একটি খালি ফ্যামিলি ট্রি তৈরি করতে চান?')) {
      const blankTree: FamilyTree = {
        people: {},
        rootIds: [],
        meta: { familyTitle: 'আমাদের বংশ' },
      };
      setTree(blankTree);
      setSelectedPerson(null);
      localStorage.setItem(STORAGE_KEY, '');
      navigateTo({}, true, blankTree);
    }
  };

  // File Upload Handler (CSV / XLSX)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const sheetRows: string[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          const rawRows = sheetRows.map(row => ({
            key: (row[0] || '').toString(),
            value: (row[1] || '').toString(),
          }));
          const parsedTree = parseKeyValueBlocksToTree(rawRows);
          setTree(parsedTree);
          navigateTo({}, true, parsedTree);
        } catch (err) {
          alert('এক্সেল ফাইল পড়তে সমস্যা হয়েছে। নিশ্চিত করুন ফাইলটিতে ২টি কলাম রয়েছে।');
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          handleParseText(text);
          navigateTo({}, true);
        }
      };
      reader.readAsText(file);
    }

    // Reset input
    e.target.value = '';
  };

  // In-App Editing: Update Person
  const handleSavePerson = (updatedPerson: Person) => {
    setTree(prev => ({
      ...prev,
      people: {
        ...prev.people,
        [updatedPerson.id]: updatedPerson,
      },
    }));
  };

  // In-App Editing: Delete Person
  const handleDeletePerson = (personId: string) => {
    setTree(prev => {
      const copy = { ...prev.people };
      delete copy[personId];

      // Remove from parents/children/spouses
      for (const p of Object.values(copy)) {
        p.unassociatedChildren = p.unassociatedChildren.filter(id => id !== personId);
        p.marriages = p.marriages.filter(m => m.spouseId !== personId);
        for (const m of p.marriages) {
          m.children = m.children.filter(id => id !== personId);
        }
      }

      const updatedRoots = prev.rootIds.filter(id => id !== personId);
      return {
        ...prev,
        people: copy,
        rootIds: updatedRoots.length > 0 ? updatedRoots : Object.keys(copy).slice(0, 1),
      };
    });

    if (selectedPerson?.id === personId) {
      handleClosePersonModal();
    }
  };

  // In-App Editing: Add Child
  const handleAddChild = (data: {
    name: string;
    gender: Gender;
    birth?: string;
    death?: string;
    village?: string;
    notes?: string;
    spouseId?: string;
  }) => {
    const parent = addRelativeState.person;
    if (!parent) return;

    const newChildId = data.name.trim();
    const newChild: Person = {
      id: newChildId,
      name: data.name.trim(),
      gender: data.gender,
      birth: data.birth,
      death: data.death,
      village: data.village,
      notes: data.notes,
      isDeceased: Boolean(data.death || (data.notes && (data.notes.includes('প্রয়াত') || data.notes.includes('মৃত') || data.notes.includes('মরহুম') || data.notes.includes('মরহুমা')))),
      customProperties: {},
      marriages: [],
      unassociatedChildren: [],
      fatherId: parent.gender === 'male' ? parent.id : data.spouseId,
      motherId: parent.gender === 'female' ? parent.id : data.spouseId,
    };

    setTree(prev => {
      const updatedPeople = { ...prev.people, [newChild.id]: newChild };
      const updatedParent = { ...updatedPeople[parent.id] };

      if (data.spouseId) {
        // Add to specific marriage
        const marriage = updatedParent.marriages.find(m => m.spouseId === data.spouseId);
        if (marriage) {
          marriage.children = [...marriage.children, newChild.id];
        }
        // Also update the spouse's marriage
        const spouse = updatedPeople[data.spouseId];
        if (spouse) {
          const spouseMarriage = spouse.marriages.find(m => m.spouseId === parent.id);
          if (spouseMarriage && !spouseMarriage.children.includes(newChild.id)) {
            spouseMarriage.children = [...spouseMarriage.children, newChild.id];
          }
        }
      } else {
        updatedParent.unassociatedChildren = [...updatedParent.unassociatedChildren, newChild.id];
      }

      updatedPeople[parent.id] = updatedParent;

      return {
        ...prev,
        people: updatedPeople,
      };
    });
  };

  // In-App Editing: Add Spouse
  const handleAddSpouse = (data: {
    name: string;
    gender: Gender;
    birth?: string;
    death?: string;
    village?: string;
    notes?: string;
  }) => {
    const person = addRelativeState.person;
    if (!person) return;

    const spouseId = data.name.trim();
    const newSpouse: Person = {
      id: spouseId,
      name: data.name.trim(),
      gender: data.gender,
      birth: data.birth,
      death: data.death,
      village: data.village,
      notes: data.notes,
      isDeceased: Boolean(data.death || (data.notes && (data.notes.includes('প্রয়াত') || data.notes.includes('মৃত') || data.notes.includes('মরহুম') || data.notes.includes('মরহুমা')))),
      customProperties: {},
      marriages: [
        {
          id: `m_${spouseId}_${person.id}`,
          spouseId: person.id,
          children: [],
        },
      ],
      unassociatedChildren: [],
    };

    setTree(prev => {
      const updatedPeople = { ...prev.people, [newSpouse.id]: newSpouse };
      const updatedPerson = { ...updatedPeople[person.id] };

      updatedPerson.marriages = [
        ...updatedPerson.marriages,
        {
          id: `m_${person.id}_${spouseId}`,
          spouseId: spouseId,
          children: [],
        },
      ];

      updatedPeople[person.id] = updatedPerson;

      return {
        ...prev,
        people: updatedPeople,
      };
    });
  };

  // In-App Editing: Add New Root / Independent Person
  const handleAddPerson = (data: {
    name: string;
    gender: Gender;
    birth?: string;
    death?: string;
    village?: string;
    notes?: string;
  }) => {
    const cleanName = data.name.trim();
    if (!cleanName) return;

    let id = cleanName;
    if (tree.people[id]) {
      let counter = 2;
      while (tree.people[`${cleanName} (${counter})`]) {
        counter++;
      }
      id = `${cleanName} (${counter})`;
    }

    const newPerson: Person = {
      id,
      name: cleanName,
      gender: data.gender,
      birth: data.birth,
      death: data.death,
      village: data.village,
      notes: data.notes,
      isDeceased: Boolean(data.death || (data.notes && (data.notes.includes('প্রয়াত') || data.notes.includes('মৃত') || data.notes.includes('মরহুম') || data.notes.includes('মরহুমা')))),
      customProperties: {
        ...(newPersonCoords ? { _x: newPersonCoords.x.toString(), _y: newPersonCoords.y.toString() } : {})
      },
      marriages: [],
      unassociatedChildren: [],
    };
    setNewPersonCoords(null);

    setTree(prev => {
      const updatedPeople = { ...prev.people, [newPerson.id]: newPerson };
      const updatedRoots = prev.rootIds.includes(newPerson.id)
        ? prev.rootIds
        : [...prev.rootIds, newPerson.id];

      return {
        ...prev,
        people: updatedPeople,
        rootIds: updatedRoots,
      };
    });

    setSelectedPerson(newPerson);
  };

  // Export Poster as PNG
  const handleExportPoster = async () => {
    const visualizerEl = document.querySelector('.overflow-hidden') as HTMLElement;
    if (!visualizerEl) return;

    try {
      const dataUrl = await toPng(visualizerEl, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'bonsho-family-tree.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('ছবি তৈরি করতে সমস্যা হয়েছে।');
      console.error(err);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-100 overflow-hidden">

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header */}
      <Header
        onOpenPasteModal={() => navigateTo({ modal: 'clipboard' })}
        onOpenUpload={() => fileInputRef.current?.click()}
        onOpenGoogleModal={() => navigateTo({ modal: 'google' })}
        onOpenQRCode={() => navigateTo({ modal: 'qr' })}
        onLoadSample={handleLoadSample}
        onNewTree={handleNewTree}
        onExportExcel={() => downloadTreeAsExcel(tree)}
        onExportCSV={() => downloadTreeAsCSV(tree)}
        onExportPoster={handleExportPoster}
        onCopyToClipboard={() => {
          navigator.clipboard.writeText(treeToCSV(tree))
            .then(() => alert('ট্রি ডেটা ক্লিপবোর্ডে কপি করা হয়েছে!'))
            .catch(() => alert('কপি করতে সমস্যা হয়েছে।'));
        }}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        totalPeopleCount={Object.keys(tree.people).length}
        connectedSheet={connectedSheet}
      />

      {/* Main Visualizer Canvas */}
      <main className="flex-1 relative">
        {hasUnsavedChanges && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-sm border border-amber-200 shadow-xl rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>গুগল শিটে কিছু পরিবর্তন সেভ করা বাকি আছে।</span>
            </div>
            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold transition shadow-sm whitespace-nowrap disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  সেভ হচ্ছে...
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  গুগল শিটে সেভ করুন
                </>
              )}
            </button>
          </div>
        )}
        <Visualizer
          tree={tree}
          searchQuery={searchQuery}
          onSelectPerson={(p) => navigateTo({ person: p.id })}
          onAddChild={(p) => navigateTo({ person: p.id, add: 'child', target: p.id })}
          onAddSpouse={(p) => navigateTo({ person: p.id, add: 'spouse', target: p.id })}
          onAddPerson={(x, y) => {
            if (x !== undefined && y !== undefined) {
              setNewPersonCoords({ x, y });
            } else {
              setNewPersonCoords(null);
            }
            navigateTo({ add: 'person' });
          }}
        />
      </main>

      {/* Direct Paste Modal */}
      <PasteModal
        isOpen={isPasteModalOpen}
        onClose={closeActiveModal}
        onParseText={handleParseText}
        tree={tree}
      />

      {/* Google Sheets Modal (Method 2: OAuth + Picker + 2-Way Sync) */}
      <GoogleSyncModal
        isOpen={isGoogleModalOpen}
        onClose={closeActiveModal}
        tree={tree}
        onTreeLoaded={(newTree) => {
          setTree(newTree);
          navigateTo({}, true, newTree);
        }}
        connectedSheet={connectedSheet}
        onSetConnectedSheet={setConnectedSheet}
        accessToken={accessToken}
        onSetAccessToken={setAccessToken}
        onMarkAsSynced={() => setLastSyncedTree(JSON.stringify(tree))}
      />

      {/* QR Code Export Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={closeActiveModal}
        tree={tree}
      />

      {/* Person Detail Modal */}
      <PersonModal
        person={selectedPerson}
        tree={tree}
        isOpen={Boolean(selectedPerson) && !editingPerson && !addRelativeState.isOpen}
        onClose={handleClosePersonModal}
        onSelectPerson={(id) => navigateTo({ person: id })}
        onEditPerson={(p) => navigateTo({ person: p.id, edit: p.id })}
        onAddChild={(p) => navigateTo({ person: p.id, add: 'child', target: p.id })}
        onAddSpouse={(p) => navigateTo({ person: p.id, add: 'spouse', target: p.id })}
        canGoBack={modalDepth > 1}
        onBack={closeActiveModal}
      />

      {/* Edit Person Modal */}
      <EditPersonModal
        person={editingPerson}
        isOpen={Boolean(editingPerson)}
        onClose={closeActiveModal}
        onSave={handleSavePerson}
        onDeletePerson={handleDeletePerson}
      />

      {/* Add Relative Modal */}
      <AddRelativeModal
        person={addRelativeState.person}
        mode={addRelativeState.mode}
        tree={tree}
        isOpen={addRelativeState.isOpen}
        onClose={closeActiveModal}
        onAdd={(data) => {
          if (addRelativeState.mode === 'child') {
            handleAddChild(data);
          } else if (addRelativeState.mode === 'spouse') {
            handleAddSpouse(data);
          } else {
            handleAddPerson(data);
          }
        }}
      />

    </div>
  );
};

export default App;

