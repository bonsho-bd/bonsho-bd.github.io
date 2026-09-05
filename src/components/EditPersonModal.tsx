import React, { useState, useEffect } from 'react';
import { Person, Gender } from '../types/family';
import { X, Check, Trash2, Plus } from 'lucide-react';

interface EditPersonModalProps {
  person: Person | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Person) => void;
  onDeletePerson?: (id: string) => void;
}

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  person,
  isOpen,
  onClose,
  onSave,
  onDeletePerson,
}) => {
  if (!isOpen || !person) return null;

  const [name, setName] = useState(person.name);
  const [gender, setGender] = useState<Gender>(person.gender);
  const [birth, setBirth] = useState(person.birth || '');
  const [death, setDeath] = useState(person.death || '');
  const [village, setVillage] = useState(person.village || '');
  const [notes, setNotes] = useState(person.notes || '');
  const [visibleFields, setVisibleFields] = useState<{
    birth: boolean;
    death: boolean;
    village: boolean;
    notes: boolean;
  }>({
    birth: Boolean(person.birth),
    death: Boolean(person.death),
    village: Boolean(person.village),
    notes: Boolean(person.notes),
  });

  const [customProps, setCustomProps] = useState<{ key: string; val: string }[]>(
    Object.entries(person.customProperties).map(([key, val]) => ({ key, val }))
  );

  const [newCustomKey, setNewCustomKey] = useState('');
  const [newCustomVal, setNewCustomVal] = useState('');

  useEffect(() => {
    if (person && isOpen) {
      setName(person.name);
      setGender(person.gender);
      setBirth(person.birth || '');
      setDeath(person.death || '');
      setVillage(person.village || '');
      setNotes(person.notes || '');
      setVisibleFields({
        birth: Boolean(person.birth),
        death: Boolean(person.death),
        village: Boolean(person.village),
        notes: Boolean(person.notes),
      });
      setCustomProps(
        Object.entries(person.customProperties).map(([key, val]) => ({ key, val }))
      );
    }
  }, [person, isOpen]);

  const handleAddCustomProp = () => {
    if (!newCustomKey.trim() || !newCustomVal.trim()) return;
    setCustomProps([...customProps, { key: newCustomKey.trim(), val: newCustomVal.trim() }]);
    setNewCustomKey('');
    setNewCustomVal('');
  };

  const handleRemoveCustomProp = (idx: number) => {
    setCustomProps(customProps.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const propsObj: Record<string, string> = {};
    for (const { key, val } of customProps) {
      if (key && val) propsObj[key] = val;
    }

    const updated: Person = {
      ...person,
      name: name.trim(),
      gender,
      birth: (visibleFields.birth && birth.trim()) ? birth.trim() : undefined,
      death: (visibleFields.death && death.trim()) ? death.trim() : undefined,
      village: (visibleFields.village && village.trim()) ? village.trim() : undefined,
      notes: (visibleFields.notes && notes.trim()) ? notes.trim() : undefined,
      isDeceased: Boolean((visibleFields.death && death.trim()) || (visibleFields.notes && (notes.includes('মরহুম') || notes.includes('মরহুমা')))),
      customProperties: propsObj,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-base font-bold text-slate-800">তথ্য সম্পাদন করুন</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-3.5 text-sm">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">পূর্ণ নাম *</label>
            <input
              type="text"
              required
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
                { val: 'male', label: 'পুরুষ (Male)' },
                { val: 'female', label: 'নারী (Female)' },
                { val: 'other', label: 'অন্যান্য (Other)' },
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

          {/* Revealed Optional Fields */}
          {visibleFields.birth && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">জন্ম সাল / তারিখ (Birthday / Year)</label>
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
                placeholder="যেমন: 1965"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            </div>
          )}

          {visibleFields.village && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">ঠিকানা (Address)</label>
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
                <label className="text-xs font-semibold text-slate-700">মৃত্যু সাল (Death year)</label>
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
                placeholder="যেমন: 2020"
                value={death}
                onChange={(e) => setDeath(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            </div>
          )}

          {visibleFields.notes && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">স্মৃতি, খেতাব বা বিবরণ (Info)</label>
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
                placeholder="যেমন: বীর মুক্তিযোদ্ধা, শিক্ষক"
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
                + তথ্য যোগ করুন (Add info):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {!visibleFields.birth && (
                  <button
                    type="button"
                    onClick={() => setVisibleFields(prev => ({ ...prev, birth: true }))}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>Birthday/year</span>
                  </button>
                )}
                {!visibleFields.village && (
                  <button
                    type="button"
                    onClick={() => setVisibleFields(prev => ({ ...prev, village: true }))}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>Address</span>
                  </button>
                )}
                {!visibleFields.death && (
                  <button
                    type="button"
                    onClick={() => setVisibleFields(prev => ({ ...prev, death: true }))}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-rose-600" />
                    <span>Death year</span>
                  </button>
                )}
                {!visibleFields.notes && (
                  <button
                    type="button"
                    onClick={() => setVisibleFields(prev => ({ ...prev, notes: true }))}
                    className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border border-slate-200 rounded-lg text-slate-600 transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-amber-600" />
                    <span>Info</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Custom Properties */}
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-2">কাস্টম প্রপার্টি (পেশা, রক্তের গ্রুপ ইত্যাদি)</label>

            {customProps.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={p.key}
                  onChange={(e) => {
                    const copy = [...customProps];
                    copy[idx].key = e.target.value;
                    setCustomProps(copy);
                  }}
                  className="w-1/3 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={p.val}
                  onChange={(e) => {
                    const copy = [...customProps];
                    copy[idx].val = e.target.value;
                    setCustomProps(copy);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCustomProp(idx)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="প্রপার্টি (যেমন: পেশা)"
                value={newCustomKey}
                onChange={(e) => setNewCustomKey(e.target.value)}
                className="w-1/3 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder="মান (যেমন: চিকিৎসক)"
                value={newCustomVal}
                onChange={(e) => setNewCustomVal(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddCustomProp}
                className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>যোগ</span>
              </button>
            </div>
          </div>

          {/* Delete Option */}
          {onDeletePerson && (
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`আপনি কি সত্যিই ${person.name}-কে মুছে ফেলতে চান?`)) {
                    onDeletePerson(person.id);
                    onClose();
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ট্রি থেকে মুছে ফেলুন</span>
              </button>
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
              <span>সংরক্ষণ করুন</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

