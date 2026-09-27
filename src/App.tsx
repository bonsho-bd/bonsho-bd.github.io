import React from 'react';
import { parseRawText } from './lib/parser';
import { SAMPLE_FAMILY_TEXT_BN, SAMPLE_FAMILY_TEXT_EN } from './lib/sampleData';
import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { PasteModal } from './components/PasteModal';
import { PersonModal } from './components/PersonModal';
import { EditPersonModal } from './components/EditPersonModal';
import { AddRelativeModal } from './components/AddRelativeModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { QRCodeModal } from './components/QRCodeModal';
import { extractTreeFromCurrentUrl, generateQRUrlForTree } from './lib/qrCodec';
import { toPng } from 'html-to-image';
import { CloudUpload, AlertCircle, Loader2 } from 'lucide-react';

import { useFamilyGraph } from './hooks/useFamilyGraph';
import { useGoogleSync } from './hooks/useGoogleSync';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
import { useLanguage } from './i18n';

export const App: React.FC = () => {
  const { language, t } = useLanguage();

  // Use custom hooks
  const {
    graph,
    setTree,
    savePerson,
    deletePerson,
    addPerson
  } = useFamilyGraph();

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
  } = useGoogleSync(graph);

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
  } = useAppNavigation(graph);

  const { toasts, showToast, dismissToast } = useToast();

  // Check URL on load for encoded graph
  React.useEffect(() => {
    const encodedGraph = extractTreeFromCurrentUrl();
    if (encodedGraph) {
      setTree(encodedGraph);
      markAsSynced(encodedGraph); // Reset sync state for new graph
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
      const parsedGraph = parseRawText(rawText);
      setTree(parsedGraph);
      navigateTo({}, true, parsedGraph);
      showToast(t.app.graphUpdatedToast, 'success');
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Clear Graph
  const handleNewTree = () => {
    const emptyGraph = { people: {} };
    setTree(emptyGraph);
    disconnectSheet();
    markAsSynced(emptyGraph);
    navigateTo({}, true, emptyGraph);
  };

  // Load Sample
  const handleLoadSample = () => {
    const sampleText = language === 'bn' ? SAMPLE_FAMILY_TEXT_BN : SAMPLE_FAMILY_TEXT_EN;
    const sample = parseRawText(sampleText);
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

    // Inject watermark for viewport export
    const watermark = document.createElement('div');
    watermark.innerText = t.app.watermark;
    watermark.style.position = 'absolute';
    watermark.style.bottom = '20px';
    watermark.style.right = '20px';
    watermark.style.color = 'rgba(0, 0, 0, 0.25)';
    watermark.style.fontFamily = 'system-ui, sans-serif';
    watermark.style.fontSize = '16px';
    watermark.style.fontWeight = 'bold';
    watermark.style.pointerEvents = 'none';
    watermark.style.userSelect = 'none';
    watermark.style.zIndex = '50';
    watermark.id = 'temp-watermark-viewport';

    visualizerEl.appendChild(watermark);

    // Wait for reflow and image load
    await new Promise(r => setTimeout(r, 150));

    try {
      const dataUrl = await toPng(visualizerEl, { quality: 1, pixelRatio: 2, skipFonts: false });
      const link = document.createElement('a');
      link.download = 'bonsho-viewport.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      showToast(t.app.imageErrorToast, 'error');
      console.error(err);
    } finally {
      const el = document.getElementById('temp-watermark-viewport');
      if (el) el.remove();
    }
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    try {
      const { url } = generateQRUrlForTree(graph);
      const peopleCount = Object.keys(graph.people).length;
      const text = encodeURIComponent(t.app.whatsAppShareMessage(peopleCount, url));
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    } catch (err) {
      showToast(t.app.shareErrorToast, 'error');
      console.error(err);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-100 overflow-hidden">
      <Header
        onOpenPasteModal={() => navigateTo({ modal: 'clipboard' })}
        onOpenGoogleModal={() => navigateTo({ modal: 'google' })}
        onOpenQRCode={() => navigateTo({ modal: 'qr' })}
        onLoadSample={handleLoadSample}
        onNewTree={handleNewTree}
        onExportViewport={handleExportViewport}
        onShareWhatsApp={handleShareWhatsApp}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        totalPeopleCount={Object.keys(graph.people).length}
        connectedSheet={connectedSheet}
      />

      <main className="flex-1 relative">
        {hasUnsavedChanges && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-sm border border-amber-200 shadow-xl rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>
                {syncError
                  ? `${t.app.syncErrorPrefix}${syncError}`
                  : t.app.unsavedChanges}
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
                  {t.app.saving}
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  {t.app.saveToSheet}
                </>
              )}
            </button>
          </div>
        )}
        <Visualizer
          graph={graph}
          searchQuery={searchQuery}
          onSelectPerson={(p) => navigateTo({ person: p.id })}
          onAddChild={(p) => navigateTo({ person: p.id, add: 'child', target: p.id })}
          onAddSpouse={(p) => navigateTo({ person: p.id, add: 'spouse', target: p.id })}
          onAddPerson={() => {
            navigateTo({ add: 'person' });
          }}
          onLoadSample={handleLoadSample}
        />
      </main>

      <PasteModal
        isOpen={isPasteModalOpen}
        onClose={closeActiveModal}
        onParseText={handleParseText}
        graph={graph}
      />

      <GoogleSyncModal
        isOpen={isGoogleModalOpen}
        onClose={closeActiveModal}
        graph={graph}
        onTreeLoaded={(newTree) => {
          setTree(newTree);
          markAsSynced(newTree);
          navigateTo({}, true, newTree);
        }}
        connectedSheet={connectedSheet}
        onSetConnectedSheet={setConnectedSheet}
        accessToken={accessToken}
        onSetAccessToken={setAccessToken}
      />

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={closeActiveModal}
        graph={graph}
      />

      <PersonModal
        person={selectedPerson}
        graph={graph}
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
        graph={graph}
        isOpen={addRelativeState.isOpen}
        onClose={closeActiveModal}
        onAdd={(data) => {
          const newPerson = addPerson(data);
          if (newPerson) {
            showToast(t.app.personAddedToast(newPerson.name), 'success');
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
