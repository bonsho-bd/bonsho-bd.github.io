import React, { useState, useEffect } from 'react';
import { Person, Gender, FamilyTree } from '../types/family';
import { X, Check, Baby, Heart, UserPlus, Plus } from 'lucide-react';

interface AddRelativeModalProps {
  person: Person | null;
  mode: 'child' | 'spouse' | 'person';
  tree: FamilyTree;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    gender: Gender;
    birth?: string;
    death?: string;
    village?: string;
    notes?: string;
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
  if (!isOpen) return null;
  if (mode !== 'person' && !person) return null;

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>(
    mode === 'spouse'
      ? (person?.gender === 'male' ? 'female' : 'male')
      : 'male'
  );
  const [birth, setBirth] = useState('');
  const [death, setDeath] = useState('');
  const [village, setVillage] = useState('');
  const [notes, setNotes] = useState('');
  const [visibleFields, setVisibleFields] = useState<{
    birth: boolean;
    village: boolean;
    death: boolean;
    notes: boolean;
  }>({
    birth: false,
    village: false,
    death: false,
    notes: false,
  });

  const [selectedSpouseId, setSelectedSpouseId] = useState<string>(
    person && person.marriages.length > 0 ? person.marriages[0].spouseId : ''
  );

  useEffect(() => {
    if (isOpen) {
      setName('');
      setGender(
        mode === 'spouse'
          ? (person?.gender === 'male' ? 'female' : 'male')
          : 'male'
      );
      setBirth('');
      setDeath('');
      setVillage('');
      setNotes('');
      setVisibleFields({
        birth: false,
        village: false,
        death: false,
        notes: false,
      });
      setSelectedSpouseId(
        person && person.marriages.length > 0 ? person.marriages[0].spouseId : ''
      );
    }
  }, [isOpen, mode, person]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      gender,
      birth: (visibleFields.birth && birth.trim()) ? birth.trim() : undefined,
      death: (visibleFields.death && death.trim()) ? death.trim() : undefined,
      village: (visibleFields.village && village.trim()) ? village.trim() : undefined,
      notes: (visibleFields.notes && notes.trim()) ? notes.trim() : undefined,
      spouseId: mode === 'child' ? selectedSpouseId || undefined : undefined,
    });

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
            ) : mode === 'spouse' ? (
              <Heart className="w-5 h-5 text-rose-500" />
            ) : (
              <UserPlus className="w-5 h-5 text-emerald-600" />
            )}
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {mode === 'child' ? `${person?.name} এর সন্তান যোগ` :
                 mode === 'spouse' ? `${person?.name} এর জীবনসঙ্গী যোগ` :
                 'নতুন ব্যক্তি (রুট) যোগ করুন'}
              </h2>
              {mode === 'person' && (
                <p className="text-[11px] text-slate-500">বংশতালিকায় নতুন রুট বা স্বাধীন সদস্য</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-sm max-h-[80vh] overflow-y-auto">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {mode === 'child' ? 'সন্তানের নাম *' : mode === 'spouse' ? 'স্বামী/স্ত্রীর নাম *' : 'ব্যক্তির নাম *'}
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="পূর্ণ নাম লিখুন"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">লিঙ্গ</label>
            <div className="flex gap-2">
              {[
                { val: 'male', label: 'পুরুষ' },
                { val: 'female', label: 'নারী' },
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
          {mode === 'child' && person && person.marriages.length > 0 && (
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

          {/* Revealed Optional Fields */}
          {visibleFields.birth && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">জন্ম সাল / তারিখ</label>
                <button
                  type="button"
                  onClick={() => {
                    setVisibleFields(prev => ({ ...prev, birth: false }));
                    setBirth('');
                  }}
                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition"
                  title="বাদ দিন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                placeholder="যেমন: ১৯৮৫ বা ১৫/০৮/১৯৮৫"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            </div>
          )}

          {visibleFields.village && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">ঠিকানা / গ্রামের বাড়ি</label>
                <button
                  type="button"
                  onClick={() => {
                    setVisibleFields(prev => ({ ...prev, village: false }));
                    setVillage('');
                  }}
                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition"
                  title="বাদ দিন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                placeholder="যেমন: রামপুর, চাঁদপুর"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            </div>
          )}

          {visibleFields.death && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">মৃত্যু সাল</label>
                <button
                  type="button"
                  onClick={() => {
                    setVisibleFields(prev => ({ ...prev, death: false }));
                    setDeath('');
                  }}
                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition"
                  title="বাদ দিন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                placeholder="যেমন: ২০২১"
                value={death}
                onChange={(e) => setDeath(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            </div>
          )}

          {visibleFields.notes && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">বিবরণ / তথ্য</label>
                <button
                  type="button"
                  onClick={() => {
                    setVisibleFields(prev => ({ ...prev, notes: false }));
                    setNotes('');
                  }}
                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition"
                  title="বাদ দিন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="যেমন: শিক্ষক, মুক্তিযোদ্ধা বা বিশেষ তথ্য"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            </div>
          )}

          {/* Clean Add Field Buttons */}
          {(!visibleFields.birth || !visibleFields.village || !visibleFields.death || !visibleFields.notes) && (
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                + আরও তথ্য যোগ করুন:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {!visibleFields.birth && (
                  <button
                    type="button"
                    onClick={() => setVisibleFields(prev => ({ ...prev, birth: true }))}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>জন্ম সাল</span>
                  </button>
                )}
                {!visibleFields.village && (
                  <button
                    type="button"
                    onClick={() => setVisibleFields(prev => ({ ...prev, village: true }))}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>ঠিকানা</span>
                  </button>
                )}
                {!visibleFields.death && (
                  <button
                    type="button"
                    onClick={() => setVisibleFields(prev => ({ ...prev, death: true }))}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-rose-600" />
                    <span>মৃত্যু সাল</span>
                  </button>
                )}
                {!visibleFields.notes && (
                  <button
                    type="button"
                    onClick={() => setVisibleFields(prev => ({ ...prev, notes: true }))}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border border-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-amber-600" />
                    <span>বিবরণ/তথ্য</span>
                  </button>
                )}
              </div>
            </div>
          )}

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

