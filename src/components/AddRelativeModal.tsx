import React, { useState } from 'react';
import { Person, Gender, FamilyTree } from '../types/family';
import { X, Check, Baby, Heart } from 'lucide-react';

interface AddRelativeModalProps {
  person: Person | null;
  mode: 'child' | 'spouse';
  tree: FamilyTree;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    gender: Gender;
    birth?: string;
    spouseId?: string; // which marriage this child belongs to
  }) => void;
}

export const AddRelativeModal: React.FC<AddRelativeModalProps> = ({
  person,
  mode,
  tree,
  isOpen,
  onClose,
  onAdd,
}) => {
  if (!isOpen || !person) return null;

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>(
    mode === 'spouse'
      ? (person.gender === 'male' ? 'female' : 'male')
      : 'male'
  );
  const [birth, setBirth] = useState('');
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>(
    person.marriages.length > 0 ? person.marriages[0].spouseId : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      gender,
      birth: birth.trim() || undefined,
      spouseId: mode === 'child' ? selectedSpouseId || undefined : undefined,
    });

    setName('');
    setBirth('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            {mode === 'child' ? (
              <Baby className="w-5 h-5 text-emerald-600" />
            ) : (
              <Heart className="w-5 h-5 text-rose-500" />
            )}
            <h2 className="text-base font-bold text-slate-800">
              {mode === 'child' ? `${person.name} এর সন্তান যোগ` : `${person.name} এর জীবনসঙ্গী যোগ`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {mode === 'child' ? 'সন্তানের নাম *' : 'স্বামী/স্ত্রীর নাম *'}
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="পূর্ণ নাম লিখুন"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">লিঙ্গ</label>
            <div className="flex gap-2">
              {[
                { val: 'male', label: 'ছেলে (Male)' },
                { val: 'female', label: 'মেয়ে (Female)' },
              ].map(({ val, label }) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setGender(val as Gender)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                    gender === val
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* If adding a child and the person has multiple spouses, let them select the mother/father */}
          {mode === 'child' && person.marriages.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {person.gender === 'male' ? 'সন্তানের মা নির্বাচন করুন' : 'সন্তানের বাবা নির্বাচন করুন'}
              </label>
              <select
                value={selectedSpouseId}
                onChange={(e) => setSelectedSpouseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {person.marriages.map(m => {
                  const spouse = tree.people[m.spouseId];
                  return (
                    <option key={m.spouseId} value={m.spouseId}>
                      {spouse ? spouse.name : m.spouseId}
                    </option>
                  );
                })}
                <option value="">অনির্দিষ্ট / অপর মাতা-পিতা ছাড়াই</option>
              </select>
            </div>
          )}

          {/* Birth Year */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">জন্ম সাল (ঐচ্ছিক)</label>
            <input
              type="text"
              placeholder="যেমন: 1995"
              value={birth}
              onChange={(e) => setBirth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>যোগ করুন</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

