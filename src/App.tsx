import React, { useRef } from 'react';
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
import { extractTreeFromCurrentUrl, generateQRUrlForTree, generateQRCodeWithLogo } from './lib/qrCodec';
import { toPng } from 'html-to-image';
import { CloudUpload, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

import { useFamilyTree } from './hooks/useFamilyTree';
import { useGoogleSync } from './hooks/useGoogleSync';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Toast';

export const App: React.FC = () => {
  // Use custom hooks
  const {
    tree,
    setTree,
    savePerson,
    deletePerson,
    addPerson
  } = useFamilyTree();

  const {
    connectedSheet,
    setConnectedSheet,
    accessToken,
    setAccessToken,
    isSyncing,
    hasUnsavedChanges,
    syncError,
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

  const { toasts, showToast, dismissToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check URL on load for encoded tree
  React.useEffect(() => {
    const encodedTree = extractTreeFromCurrentUrl();
    if (encodedTree) {
      setTree(encodedTree);
      markAsSynced(encodedTree); // Reset sync state for new tree
      // Clean up encoded data from URL while preserving other params (e.g. lang=en)
      const url = new URL(window.location.href);
      url.searchParams.delete('qr-v0');
      url.searchParams.delete('d');
      url.searchParams.delete('redirect');
      if (url.hash.includes('view/qr-v0/')) {
        url.hash = '';
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, []); // Run once

  // Handle Raw Text Parse (from Paste modal)
  const handleParseText = (rawText: string): boolean => {
    try {
      const parsedTree = parseRawText(rawText);
      setTree(parsedTree);
      disconnectSheet();
      markAsSynced(parsedTree);
      navigateTo({}, true, parsedTree);
      showToast('ট্রি সফলভাবে আপডেট করা হয়েছে!', 'success');
      return true;
    } catch (err) {
      console.error(err);
      return false;
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
        const success = handleParseText(text);
        if (!success) {
          showToast('তথ্য পার্স করতে সমস্যা হয়েছে। অনুগ্রহ করে ফরম্যাট যাচাই করুন।', 'error');
        }
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

          const rawRows = rows
            .map((row) => ({
              key: String(row?.[0] || '').trim(),
              value: String(row?.[1] || '').trim(),
            }))
            .filter((r) => r.key || r.value);

          if (rawRows.length === 0) return;

          const parsedTree = parseKeyValueBlocksToTree(rawRows);
          setTree(parsedTree);
          disconnectSheet();
          markAsSynced(parsedTree);
          navigateTo({}, true, parsedTree);
          showToast('এক্সেল ফাইল সফলভাবে লোড করা হয়েছে!', 'success');
        } catch (err) {
          showToast('এক্সেল ফাইল পড়তে সমস্যা হয়েছে। নিশ্চিত করুন ফাইলটিতে ২টি কলাম রয়েছে।', 'error');
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
    const emptyTree = { people: {} };
    setTree(emptyTree);
    disconnectSheet();
    markAsSynced(emptyTree);
    navigateTo({}, true, emptyTree);
  };

  // Load Sample
  const handleLoadSample = () => {
    const sample = parseRawText(SAMPLE_FAMILY_TEXT);
    setTree(sample);
    disconnectSheet();
    markAsSynced(sample);
    navigateTo({}, true, sample);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    const url = new URL(window.location.href);
    if (q) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    window.history.replaceState({ modalDepth }, '', url.toString());
  };

    const handleExportViewport = async () => {
    const visualizerEl = document.querySelector('main > div') as HTMLElement;
    if (!visualizerEl) return;

    // Inject QR code for viewport export
    const qrUrl = generateQRUrlForTree(tree).url;
    const qrDataUrl = await generateQRCodeWithLogo(qrUrl);
    const qrImg = document.createElement('img');
    qrImg.src = qrDataUrl;
    qrImg.style.position = 'absolute';
    qrImg.style.top = '20px';
    qrImg.style.left = '20px';
    qrImg.style.width = '100px';
    qrImg.style.height = '100px';
    qrImg.style.background = 'white';
    qrImg.style.padding = '8px';
    qrImg.style.borderRadius = '12px';
    qrImg.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';
    qrImg.style.zIndex = '50';
    qrImg.id = 'temp-qr-viewport';

    visualizerEl.appendChild(qrImg);

    // Wait for reflow and image load
    await new Promise(r => setTimeout(r, 150));

    try {
      const dataUrl = await toPng(visualizerEl, { quality: 1, pixelRatio: 2, skipFonts: false });
      const link = document.createElement('a');
      link.download = 'bonsho-viewport.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      showToast('ছবি তৈরি করতে সমস্যা হয়েছে।', 'error');
      console.error(err);
    } finally {
      const el = document.getElementById('temp-qr-viewport');
      if (el) el.remove();
    }
  };

    const handleExportFullTree = async () => {
    const visualizerRoot = document.querySelector('main > div') as HTMLElement;
    const nodesContainer = document.querySelector('.origin-top-left') as HTMLElement;
    const svgGroup = document.querySelector('svg.pointer-events-none g') as SVGGElement;
    const bgGrid = document.querySelector('.canvas-bg') as HTMLElement;

    if (!visualizerRoot || !nodesContainer || !svgGroup) {
      showToast('ফ্যামিলি ট্রি খালি', 'info');
      return;
    }

    const nodes = document.querySelectorAll('.bonsho-node');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    nodes.forEach(node => {
      const el = node as HTMLElement;
      const left = parseFloat(el.style.left || '');
      const top = parseFloat(el.style.top || '');
      if (!isNaN(left) && !isNaN(top)) {
        if (left < minX) minX = left;
        if (left > maxX) maxX = left;
        if (top < minY) minY = top;
        if (top > maxY) maxY = top;
        found = true;
      }
    });

    if (!found) {
      minX = 0; minY = 0; maxX = 500; maxY = 500;
    }

    const padding = 150;
    const nodeWidth = 250;
    const nodeHeight = 150;
    const fullWidth = (maxX - minX) + nodeWidth + padding * 2;
    const fullHeight = (maxY - minY) + nodeHeight + padding * 2;

    // Save original styles
    const origNodesTransform = nodesContainer.style.transform;
    const origSvgTransform = svgGroup.getAttribute('transform') || '';
    const origBgStyle = bgGrid?.getAttribute('style') || '';

    try {
      // Temporarily mutate live DOM inner transforms to align perfectly
      nodesContainer.style.transform = `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`;
      svgGroup.setAttribute('transform', `translate(${-minX + padding}, ${-minY + padding}) scale(1)`);
      if (bgGrid) {
        bgGrid.style.backgroundPosition = `${-minX + padding}px ${-minY + padding}px`;
      }

      // Inject QR Code directly into the live visualizer
      const qrUrl = generateQRUrlForTree(tree).url;
      const qrDataUrl = await generateQRCodeWithLogo(qrUrl);
      const qrImg = document.createElement('img');
      qrImg.src = qrDataUrl;
      qrImg.style.position = 'absolute';
      qrImg.style.top = '40px';
      qrImg.style.left = '40px';
      qrImg.style.width = '140px';
      qrImg.style.height = '140px';
      qrImg.style.background = 'white';
      qrImg.style.padding = '10px';
      qrImg.style.borderRadius = '16px';
      qrImg.style.boxShadow = '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)';
      qrImg.style.zIndex = '50';
      qrImg.id = 'temp-qr-full';
      visualizerRoot.appendChild(qrImg);

      // Wait for reflow
      await new Promise(r => setTimeout(r, 150));

      // Capture using the root, overriding its dimensions temporarily
      const dataUrl = await toPng(visualizerRoot, {
        quality: 1,
        pixelRatio: 2,
        width: fullWidth,
        height: fullHeight,
        style: {
          width: `${fullWidth}px`,
          height: `${fullHeight}px`,
          position: 'absolute',
          top: '0',
          left: '0'
        },
        skipFonts: false
      });

      const link = document.createElement('a');
      link.download = 'bonsho-full-tree.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      showToast('ছবি তৈরি করতে সমস্যা হয়েছে।', 'error');
      console.error(err);
    } finally {
      // Restore everything
      nodesContainer.style.transform = origNodesTransform;
      svgGroup.setAttribute('transform', origSvgTransform);
      if (bgGrid) bgGrid.setAttribute('style', origBgStyle);

      const qrEl = document.getElementById('temp-qr-full');
      if (qrEl) qrEl.remove();
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
        onExportFullTree={handleExportFullTree}
        onExportViewport={handleExportViewport}
        onCopyToClipboard={() => {
          navigator.clipboard.writeText(treeToCSV(tree))
            .then(() => showToast('ট্রি ডেটা ক্লিপবোর্ডে কপি করা হয়েছে!', 'success'))
            .catch(() => showToast('কপি করতে সমস্যা হয়েছে।', 'error'));
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
              <span>
                {syncError
                  ? `সেভ করতে সমস্যা হয়েছে: ${syncError}`
                  : 'গুগল শিটে কিছু পরিবর্তন সেভ করা বাকি আছে।'}
              </span>
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
          onAddPerson={() => {
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
          markAsSynced(newTree);
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
          const newPerson = addPerson(data);
          if (newPerson) {
            showToast(`${newPerson.name} যোগ করা হয়েছে!`, 'success');
            navigateTo({ person: newPerson.id }, true);
          }
        }}
      />

      {/* Modern In-App Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
};

export default App;
