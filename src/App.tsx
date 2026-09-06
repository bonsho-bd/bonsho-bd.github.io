import React, { useRef } from 'react';
import { parseRawText } from './lib/parser';
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
import { toPng } from 'html-to-image';
import { CloudUpload, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

// Hooks
import { useFamilyTree } from './hooks/useFamilyTree';
import { useGoogleSync } from './hooks/useGoogleSync';
import { useAppNavigation } from './hooks/useAppNavigation';

export const App: React.FC = () => {
  // Use custom hooks
  const { 
    tree, 
    setTree, 
    setNewPersonCoords, 
    savePerson, 
    deletePerson, 
    addChild, 
    addSpouse, 
    addPerson 
  } = useFamilyTree();

  const {
    connectedSheet,
    setConnectedSheet,
    accessToken,
    setAccessToken,
    isSyncing,
    hasUnsavedChanges,
    handleQuickSync,
    disconnectSheet,
    markAsSynced
  } = useGoogleSync(tree);

  const {
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
  } = useAppNavigation(tree);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check URL on load for encoded tree
  React.useEffect(() => {
    const encodedTree = extractTreeFromCurrentUrl();
    if (encodedTree) {
      setTree(encodedTree);
      markAsSynced(); // Reset sync state for new tree
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('d');
      window.history.replaceState({}, '', url.toString());
    }
  }, []); // Run once

  // Handle Raw Text Parse (from Paste modal)
  const handleParseText = (rawText: string) => {
    try {
      const parsedTree = parseRawText(rawText);
      setTree(parsedTree);
      disconnectSheet();
      markAsSynced();
      navigateTo({}, true, parsedTree);
    } catch (err) {
      alert('তথ্য পার্স করতে সমস্যা হয়েছে। অনুগ্রহ করে ফরম্যাট যাচাই করুন।');
      console.error(err);
    }
  };

  // Handle File Upload (CSV, TSV, TXT, Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParseText(text);
      };
      reader.readAsText(file);
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (!rows || rows.length === 0) return;

          let rawText = '';
          rows.forEach((row) => {
            if (row.length >= 2) {
              const name = String(row[0] || '').trim();
              const relation = String(row[1] || '').trim();
              if (name) {
                rawText += `${name}${relation ? `, ${relation}` : ''}\n`;
              }
            }
          });

          handleParseText(rawText);
        } catch (err) {
          alert('এক্সেল ফাইল পড়তে সমস্যা হয়েছে। নিশ্চিত করুন ফাইলটিতে ২টি কলাম রয়েছে।');
          console.error(err);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clear Tree
  const handleNewTree = () => {
    const emptyTree = { people: {}, rootIds: [] };
    setTree(emptyTree);
    disconnectSheet();
    markAsSynced();
    navigateTo({}, true, emptyTree);
  };

  // Load Sample
  const handleLoadSample = () => {
    const sample = parseRawText(SAMPLE_FAMILY_TEXT);
    setTree(sample);
    disconnectSheet();
    markAsSynced();
    navigateTo({}, true, sample);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    window.history.replaceState({ modalDepth }, '', url.toString());
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />

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

      <PasteModal
        isOpen={isPasteModalOpen}
        onClose={closeActiveModal}
        onParseText={handleParseText}
        tree={tree}
      />

      <GoogleSyncModal
        isOpen={isGoogleModalOpen}
        onClose={closeActiveModal}
        tree={tree}
        onTreeLoaded={(newTree) => {
          setTree(newTree);
          markAsSynced();
          navigateTo({}, true, newTree);
        }}
        connectedSheet={connectedSheet}
        onSetConnectedSheet={setConnectedSheet}
        accessToken={accessToken}
        onSetAccessToken={setAccessToken}
        onMarkAsSynced={markAsSynced}
      />

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={closeActiveModal}
        tree={tree}
      />

      <PersonModal
        person={selectedPerson}
        tree={tree}
        isOpen={Boolean(selectedPerson) && !editingPerson && !addRelativeState.isOpen}
        onClose={() => {
          setSelectedPerson(null);
          closeActiveModal();
        }}
        onSelectPerson={(id) => navigateTo({ person: id })}
        onEditPerson={(p) => navigateTo({ person: p.id, edit: p.id })}
        onAddChild={(p) => navigateTo({ person: p.id, add: 'child', target: p.id })}
        onAddSpouse={(p) => navigateTo({ person: p.id, add: 'spouse', target: p.id })}
        canGoBack={modalDepth > 1}
        onBack={closeActiveModal}
      />

      <EditPersonModal
        person={editingPerson}
        isOpen={Boolean(editingPerson)}
        onClose={closeActiveModal}
        onSave={savePerson}
        onDeletePerson={deletePerson}
      />

      <AddRelativeModal
        person={addRelativeState.person}
        mode={addRelativeState.mode}
        tree={tree}
        isOpen={addRelativeState.isOpen}
        onClose={closeActiveModal}
        onAdd={(data) => {
          if (addRelativeState.mode === 'child' && addRelativeState.person) {
            addChild(addRelativeState.person.id, data);
          } else if (addRelativeState.mode === 'spouse' && addRelativeState.person) {
            addSpouse(addRelativeState.person.id, data);
          } else {
            addPerson(data);
          }
        }}
      />

    </div>
  );
};

export default App;
