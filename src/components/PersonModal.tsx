import React from 'react';
import { Person, FamilyGraph } from '../types/family';
import { getParents } from '../lib/parser';
import { X, User, Heart, Baby, Calendar, FileText, Edit2, Plus, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../i18n';

interface PersonModalProps {
  person: Person | null;
  graph: FamilyGraph;
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
  graph,
  isOpen,
  onClose,
  onSelectPerson,
  onEditPerson,
  onAddChild,
  onAddSpouse,
  onBack,
  canGoBack,
}) => {
  const { t } = useLanguage();

  if (!isOpen || !person) return null;

  const { father, mother } = getParents(graph, person.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>

        {/* Header with Gender Theme */}
        <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b relative ${
          person.gender === 'female' ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-100' :
          person.gender === 'male' ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100' :
          'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-100'
        }`}>
          <div className="absolute right-4 top-4 flex items-center gap-1.5 z-10">
            {canGoBack && onBack && (
              <button
                onClick={onBack}
                title={t.common.back}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/80 transition flex items-center gap-1 text-xs font-semibold px-2 py-1 border border-slate-200/60 bg-white/40 shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">{t.common.back}</span>
              </button>
            )}
            <button
              onClick={onClose}
              title={t.common.close}
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
              {person.name ? person.name.charAt(0) : <User className="w-8 h-8" />}
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 truncate">{person.name}</h2>
                <div className="text-xs text-slate-500 font-mono mt-0.5">#{person.id}</div>
                {Boolean(person.death) && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {t.common.deceased}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                {person.birth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.common.birthPrefix}{person.birth}</span>
                  </span>
                )}
                {person.death && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.common.deathPrefix}{person.death}</span>
                  </span>
                )}
              </div>
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
              <span>{t.personModal.editDetails}</span>
            </button>
            <button
              onClick={() => onAddChild(person)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.personModal.addChild}</span>
            </button>
            <button
              onClick={() => onAddSpouse(person)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition"
            >
              <Heart className="w-3.5 h-3.5" />
              <span>{t.personModal.addSpouse}</span>
            </button>
          </div>

          {/* Attached Information (Key-Value Attributes) */}
          {Object.keys(person.attributes || {}).length > 0 && (
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3.5 text-xs space-y-2">
              <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.personModal.attachedInfo}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(person.attributes).map(([k, v]) => (
                  <div key={k} className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{k}</span>
                    <span className="text-slate-800 font-medium whitespace-pre-wrap mt-0.5">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parents */}
          {(father || mother) && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.personModal.parentsSection}</h3>
              <div className="flex gap-2">
                {father && (
                  <button
                    onClick={() => onSelectPerson(father.id)}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      {t.common.father}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-xs text-slate-800 truncate">{father.name}</div>
                      <div className="text-[10px] text-slate-400">{t.common.father}</div>
                    </div>
                  </button>
                )}
                {mother && (
                  <button
                    onClick={() => onSelectPerson(mother.id)}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 text-left transition flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs">
                      {t.common.mother}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-xs text-slate-800 truncate">{mother.name}</div>
                      <div className="text-[10px] text-slate-400">{t.common.mother}</div>
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
                <span>{t.personModal.marriagesSection}</span>
              </h3>
              {person.marriages.map((m, idx) => {
                const spouse = graph.people[m.spouseId];
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
                            ({spouse.gender === 'female' ? t.common.wife : t.common.husband})
                          </span>
                        </button>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {t.common.childrenCount(m.children.length)}
                        </span>
                      </div>
                    )}

                    {m.children.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.children.map(cId => {
                          const child = graph.people[cId];
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

        </div>

      </div>
    </div>
  );
};
