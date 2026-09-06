import React, { useState } from 'react';
import { Person, FamilyTree } from '../types/family';
import { calculateKinship } from '../lib/kinship';
import { X, User, Heart, Baby, MapPin, Calendar, Briefcase, FileText, Edit2, Plus, Sparkles, ArrowLeft } from 'lucide-react';

interface PersonModalProps {
  person: Person | null;
  tree: FamilyTree;
  isOpen: boolean;
  onClose: () => void;
  onSelectPerson: (id: string) => void;
  onEditPerson: (person: Person) => void;
  onAddChild: (parent: Person) => void;
  onAddSpouse: (person: Person) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

export const PersonModal: React.FC<PersonModalProps> = ({
  person,
  tree,
  isOpen,
  onClose,
  onSelectPerson,
  onEditPerson,
  onAddChild,
  onAddSpouse,
  onBack,
  canGoBack,
}) => {
  const [kinshipTargetId, setKinshipTargetId] = useState<string>('');

  if (!isOpen || !person) return null;

  const father = person.fatherId ? tree.people[person.fatherId] : null;
  const mother = person.motherId ? tree.people[person.motherId] : null;

  const kinshipResult = kinshipTargetId ? calculateKinship(tree, person.id, kinshipTargetId) : null;
  const otherPeople = Object.values(tree.people).filter(p => p.id !== person.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header with Gender Theme */}
        <div className={`px-4 sm:px-4 sm:px-6 py-3 sm:py-4 sm:py-5 border-b relative ${
          person.gender === 'female' ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-100' :
          person.gender === 'male' ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100' :
          'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-100'
        }`}>
          <div className="absolute right-4 top-4 flex items-center gap-1.5 z-10">
            {canGoBack && onBack && (
              <button
                onClick={onBack}
                title="পূর্ববর্তী ব্যক্তি (Back)"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/80 transition flex items-center gap-1 text-xs font-semibold px-2 py-1 border border-slate-200/60 bg-white/40 shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">পূর্ববর্তী</span>
              </button>
            )}
            <button
              onClick={onClose}
              title="বন্ধ করুন (Close)"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md ${
              person.gender === 'female' ? 'bg-rose-500 shadow-rose-200' :
              person.gender === 'male' ? 'bg-emerald-600 shadow-emerald-200' :
              'bg-slate-600 shadow-slate-200'
            }`}>
              {person.photo ? (
                <img src={person.photo} alt={person.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <User className="w-8 h-8" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 truncate">{person.name}</h2>
                {person.isDeceased && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {person.gender === 'female' ? 'মরহুমা' : 'মরহুম'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                {person.birth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>জন্ম: {person.birth}</span>
                  </span>
                )}
                {person.death && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>মৃত্যু: {person.death}</span>
                  </span>
                )}
              </div>

              {person.village && (
                <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{person.village}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditPerson(person)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>তথ্য সম্পাদনা</span>
            </button>
            <button
              onClick={() => onAddChild(person)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>সন্তান যোগ করুন</span>
            </button>
            <button
              onClick={() => onAddSpouse(person)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>স্বামী/স্ত্রী যোগ</span>
            </button>
          </div>

          {/* Notes */}
          {person.notes && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <FileText className="w-3.5 h-3.5" />
                <span>স্মৃতি ও বিবরণ:</span>
              </div>
              <p className="whitespace-pre-line leading-relaxed">{person.notes}</p>
            </div>
          )}

          {/* Custom Properties */}
          {Object.keys(person.customProperties).length > 0 && (
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs space-y-2">
              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>অন্যান্য তথ্য:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(person.customProperties).map(([k, v]) => (
                  <div key={k} className="bg-white p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{k}</span>
                    <span className="text-slate-800 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parents */}
          {(father || mother) && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">পিতা ও মাতা</h3>
              <div className="flex gap-2">
                {father && (
                  <button
                    onClick={() => onSelectPerson(father.id)}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      বাবা
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-xs text-slate-800 truncate">{father.name}</div>
                      <div className="text-[10px] text-slate-400">পিতা</div>
                    </div>
                  </button>
                )}
                {mother && (
                  <button
                    onClick={() => onSelectPerson(mother.id)}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 text-left transition flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs">
                      মা
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-xs text-slate-800 truncate">{mother.name}</div>
                      <div className="text-[10px] text-slate-400">মাতা</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Marriages and Children */}
          {person.marriages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>দাম্পত্য ও সন্তানাদি</span>
              </h3>
              {person.marriages.map((m, idx) => {
                const spouse = tree.people[m.spouseId];
                return (
                  <div key={m.id || idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                    {spouse && (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => onSelectPerson(spouse.id)}
                          className="font-semibold text-xs text-slate-800 hover:text-emerald-700 flex items-center gap-1.5"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                          <span>{spouse.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({spouse.gender === 'female' ? 'স্ত্রী' : 'স্বামী'})
                          </span>
                        </button>
                        <span className="text-[11px] text-slate-400 font-medium">{m.children.length} সন্তান</span>
                      </div>
                    )}

                    {m.children.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.children.map(cId => {
                          const child = tree.people[cId];
                          if (!child) return null;
                          return (
                            <button
                              key={cId}
                              onClick={() => onSelectPerson(child.id)}
                              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg hover:border-emerald-500 hover:text-emerald-700 flex items-center gap-1 transition shadow-2xs"
                            >
                              <Baby className="w-3 h-3 text-slate-400" />
                              <span>{child.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Unassociated Children */}
          {person.unassociatedChildren.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Baby className="w-3.5 h-3.5 text-emerald-600" />
                <span>সন্তানসন্ততি</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {person.unassociatedChildren.map(cId => {
                  const child = tree.people[cId];
                  if (!child) return null;
                  return (
                    <button
                      key={cId}
                      onClick={() => onSelectPerson(child.id)}
                      className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 hover:text-emerald-700 flex items-center gap-1 transition"
                    >
                      <Baby className="w-3 h-3 text-slate-400" />
                      <span>{child.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kinship Calculator Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>বংশীয় সম্পর্ক নির্ণয় করুন:</span>
            </div>

            <div className="space-y-2">
              <select
                value={kinshipTargetId}
                onChange={(e) => setKinshipTargetId(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">অন্য আত্মীয় নির্বাচন করুন...</option>
                {otherPeople.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {kinshipResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-700 block font-bold uppercase">সম্পর্ক</span>
                    <span className="text-sm font-bold text-emerald-900">{kinshipResult.termBn}</span>
                    <span className="text-[11px] text-emerald-700 ml-1.5">({kinshipResult.termEn})</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 text-right">{kinshipResult.description}</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

