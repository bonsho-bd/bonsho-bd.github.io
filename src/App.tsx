import React, { useState, useEffect, useRef } from 'react';
import { FamilyTree, Person, Gender } from './types/family';
import { parseRawText, parseKeyValueBlocksToTree } from './lib/parser';
import { downloadTreeAsExcel, downloadTreeAsCSV } from './lib/serializer';
import { SAMPLE_FAMILY_TEXT } from './lib/sampleData';
import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { PasteModal } from './components/PasteModal';
import { PersonModal } from './components/PersonModal';
import { EditPersonModal } from './components/EditPersonModal';
import { AddRelativeModal } from './components/AddRelativeModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';

const STORAGE_KEY = 'bonsho_family_tree_data';

export const App: React.FC = () => {
  // Tree state
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
  const [searchQuery, setSearchQuery] = useState('');

  // Google Sheet connection state
  const [connectedSheet, setConnectedSheet] = useState<{ id: string; name: string } | null>(null);

  // Modals state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [addRelativeState, setAddRelativeState] = useState<{
    isOpen: boolean;
    person: Person | null;
    mode: 'child' | 'spouse';
  }>({
    isOpen: false,
    person: null,
    mode: 'child',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  // Start a new blank family
  const handleNewTree = () => {
    if (confirm('আপনি কি সম্পূর্ণ নতুন একটি ফ্যামিলি ট্রি তৈরি করতে চান?')) {
      const initialPerson: Person = {
        id: 'আদি পুরুষ',
        name: 'আদি পুরুষ / প্রতিষ্ঠাতা',
        gender: 'male',
        customProperties: {},
        marriages: [],
        unassociatedChildren: [],
      };
      const blankTree: FamilyTree = {
        people: { [initialPerson.id]: initialPerson },
        rootIds: [initialPerson.id],
        meta: { familyTitle: 'আমাদের বংশ' },
      };
      setTree(blankTree);
      setSelectedPerson(initialPerson);
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
      setSelectedPerson(null);
    }
  };

  // In-App Editing: Add Child
  const handleAddChild = (data: {
    name: string;
    gender: Gender;
    birth?: string;
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
      village: parent.village,
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
  }) => {
    const person = addRelativeState.person;
    if (!person) return;

    const spouseId = data.name.trim();
    const newSpouse: Person = {
      id: spouseId,
      name: data.name.trim(),
      gender: data.gender,
      birth: data.birth,
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
    <div className="min-h-screen flex flex-col bg-slate-100">

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
        onOpenPasteModal={() => setIsPasteModalOpen(true)}
        onOpenUpload={() => fileInputRef.current?.click()}
        onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
        onLoadSample={handleLoadSample}
        onNewTree={handleNewTree}
        onExportExcel={() => downloadTreeAsExcel(tree)}
        onExportCSV={() => downloadTreeAsCSV(tree)}
        onExportPoster={handleExportPoster}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalPeopleCount={Object.keys(tree.people).length}
        connectedSheet={connectedSheet}
      />

      {/* Main Visualizer Canvas */}
      <main className="flex-1 relative">
        <Visualizer
          tree={tree}
          searchQuery={searchQuery}
          onSelectPerson={(p) => setSelectedPerson(p)}
          onAddChild={(p) => setAddRelativeState({ isOpen: true, person: p, mode: 'child' })}
          onAddSpouse={(p) => setAddRelativeState({ isOpen: true, person: p, mode: 'spouse' })}
        />
      </main>

      {/* Direct Paste Modal */}
      <PasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onParseText={handleParseText}
      />

      {/* Google Sheets Modal (Method 2: OAuth + Picker + 2-Way Sync) */}
      <GoogleSyncModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        tree={tree}
        onTreeLoaded={(newTree) => setTree(newTree)}
        connectedSheet={connectedSheet}
        onSetConnectedSheet={setConnectedSheet}
      />

      {/* Person Detail Modal */}
      <PersonModal
        person={selectedPerson}
        tree={tree}
        isOpen={Boolean(selectedPerson)}
        onClose={() => setSelectedPerson(null)}
        onSelectPerson={(id) => setSelectedPerson(tree.people[id] || null)}
        onEditPerson={(p) => setEditingPerson(p)}
        onAddChild={(p) => setAddRelativeState({ isOpen: true, person: p, mode: 'child' })}
        onAddSpouse={(p) => setAddRelativeState({ isOpen: true, person: p, mode: 'spouse' })}
      />

      {/* Edit Person Modal */}
      <EditPersonModal
        person={editingPerson}
        isOpen={Boolean(editingPerson)}
        onClose={() => setEditingPerson(null)}
        onSave={handleSavePerson}
        onDeletePerson={handleDeletePerson}
      />

      {/* Add Relative Modal */}
      <AddRelativeModal
        person={addRelativeState.person}
        mode={addRelativeState.mode}
        tree={tree}
        isOpen={addRelativeState.isOpen}
        onClose={() => setAddRelativeState(prev => ({ ...prev, isOpen: false }))}
        onAdd={(data) => {
          if (addRelativeState.mode === 'child') {
            handleAddChild(data);
          } else {
            handleAddSpouse(data);
          }
        }}
      />

    </div>
  );
};

export default App;

