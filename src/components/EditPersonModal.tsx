import React, { useState, useEffect } from 'react';
import { Person, Gender } from '../types/family';
import { X, Check, Trash2, Plus, AlertCircle } from 'lucide-react';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visibleFields, setVisibleFields] = useState<{
    birth: boolean;
    death: boolean;
  }>({
    birth: Boolean(person.birth),
    death: Boolean(person.death),
  });

  const [attributesList, setAttributesList] = useState<{ key: string; val: string }[]>(
    Object.entries(person.attributes || {})
      .map(([key, val]) => ({ key, val }))
  );

  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [person?.id, isOpen]);

  useEffect(() => {
    if (person && isOpen) {
      setName(person.name);
      setGender(person.gender);
      setBirth(person.birth || '');
      setDeath(person.death || '');
      setVisibleFields({
        birth: Boolean(person.birth),
        death: Boolean(person.death),
      });
      setAttributesList(
        Object.entries(person.attributes || {})
          .map(([key, val]) => ({ key, val }))
      );
      setNewKey('');
      setNewVal('');
    }
  }, [person, isOpen]);

  const handleAddAttribute = () => {
    if (!newKey.trim() || !newVal.trim()) return;
    setAttributesList([...attributesList, { key: newKey.trim(), val: newVal.trim() }]);
    setNewKey('');
    setNewVal('');
  };

  const handleRemoveAttribute = (idx: number) => {
    setAttributesList(attributesList.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const attributes: Record<string, string> = {};
    for (const { key, val } of attributesList) {
      if (key.trim() && val.trim()) {
        attributes[key.trim()] = val.trim();
      }
    }
    if (newKey.trim() && newVal.trim()) {
      attributes[newKey.trim()] = newVal.trim();
    }

    const updated: Person = {
      ...person,
      name: name.trim(),
      gender,
      birth: (visibleFields.birth && birth.trim()) ? birth.trim() : undefined,
      death: (visibleFields.death && death.trim()) ? death.trim() : undefined,
      attributes,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-base font-bold text-slate-800">তথ্য সম্পাদন করুন <span className="text-xs font-mono text-slate-400 font-normal ml-2">#{person.id}</span></h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-sm">

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

          {/* Optional Birth Field */}
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
                placeholder="যেমন: ১৯৬৫"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            </div>
          )}

          {/* Optional Death Field */}
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
                placeholder="যেমন: ২০২০"
                value={death}
                onChange={(e) => setDeath(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            </div>
          )}

          {/* Clean Add Field Buttons */}
          {(!visibleFields.birth || !visibleFields.death) && (
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
              </div>
            </div>
          )}

          {/* Dynamic Key-Value Attributes */}
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-700 mb-2">সংযুক্ত তথ্য (কী এবং মান)</label>

            {attributesList.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="কী (Key)"
                  value={p.key}
                  onChange={(e) => {
                    const copy = [...attributesList];
                    copy[idx].key = e.target.value;
                    setAttributesList(copy);
                  }}
                  className="w-1/3 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="মান (Value)"
                  value={p.val}
                  onChange={(e) => {
                    const copy = [...attributesList];
                    copy[idx].val = e.target.value;
                    setAttributesList(copy);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(idx)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="প্রপার্টি (Key)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-1/3 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder="মান (Value)"
                value={newVal}
                onChange={(e) => setNewVal(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddAttribute}
                className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>যোগ</span>
              </button>
            </div>
          </div>

          {/* Delete Option */}
          {onDeletePerson && (
            <div className="pt-2 border-t border-slate-100">
              {showDeleteConfirm ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>আপনি কি সত্যিই {person.name}-কে মুছে ফেলতে চান?</span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeletePerson(person.id);
                        onClose();
                      }}
                      className="px-3 py-1 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-xs"
                    >
                      হ্যাঁ, মুছে ফেলুন
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ট্রি থেকে মুছে ফেলুন</span>
                  </button>
                </div>
              )}
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

