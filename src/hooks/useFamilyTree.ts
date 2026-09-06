import { useState, useEffect } from 'react';
import { FamilyTree, Person, Gender, Marriage } from '../types/family';
import { checkIsDeceased } from '../lib/dictionary';

const STORAGE_KEY = 'bonsho_family_tree_data';

export interface AddChildData {
  name: string;
  gender: Gender;
  birth?: string;
  death?: string;
  village?: string;
  notes?: string;
  spouseId?: string;
}

export interface AddSpouseData {
  name: string;
  gender: Gender;
  birth?: string;
  death?: string;
  village?: string;
  notes?: string;
}

export const useFamilyTree = (initialTree?: FamilyTree) => {
  const [tree, setTree] = useState<FamilyTree>(() => {
    if (initialTree) return initialTree;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse tree from local storage', e);
      }
    }
    return { people: {}, rootIds: [] };
  });

  const [newPersonCoords, setNewPersonCoords] = useState<{x: number, y: number} | null>(null);

  // Auto-save to localStorage
  useEffect(() => {
    const treeStr = JSON.stringify(tree);
    localStorage.setItem(STORAGE_KEY, treeStr);
  }, [tree]);

  const savePerson = (updatedPerson: Person) => {
    setTree((prev) => ({
      ...prev,
      people: {
        ...prev.people,
        [updatedPerson.id]: updatedPerson,
      },
    }));
  };

  const deletePerson = (personId: string) => {
    setTree((prev) => {
      if (!prev.people[personId]) return prev;

      const updatedPeople = { ...prev.people };
      delete updatedPeople[personId];

      // Clean up references in remaining people
      Object.values(updatedPeople).forEach((person) => {
        // 1. Clean up parent IDs if pointing to the deleted person
        if (person.fatherId === personId) {
          delete person.fatherId;
        }
        if (person.motherId === personId) {
          delete person.motherId;
        }

        // 2. Clean up marriages pointing to deleted spouse
        if (person.marriages) {
          const survivingMarriages: Marriage[] = [];
          person.marriages.forEach((marriage) => {
            if (marriage.spouseId === personId) {
              // Migrate children of this dissolved marriage to unassociatedChildren so they are not lost
              marriage.children.forEach((childId) => {
                if (childId !== personId && !person.unassociatedChildren.includes(childId)) {
                  person.unassociatedChildren.push(childId);
                }
              });
            } else {
              // Remove deleted person from children list
              marriage.children = marriage.children.filter((id) => id !== personId);
              survivingMarriages.push(marriage);
            }
          });
          person.marriages = survivingMarriages;
        }

        // 3. Clean up unassociatedChildren
        if (person.unassociatedChildren) {
          person.unassociatedChildren = person.unassociatedChildren.filter((id) => id !== personId);
        }
      });

      // Recalculate roots: people with no parents, avoiding spouse duplicates
      const remainingList = Object.values(updatedPeople);
      const rootCandidates = remainingList.filter(p => !p.fatherId && !p.motherId);
      const updatedRoots: string[] = [];
      const covered = new Set<string>();

      // Preserve order of existing roots where possible
      for (const rId of prev.rootIds) {
        if (rId !== personId && updatedPeople[rId] && !covered.has(rId)) {
          updatedRoots.push(rId);
          covered.add(rId);
          for (const m of updatedPeople[rId].marriages || []) {
            covered.add(m.spouseId);
          }
        }
      }

      // Add any new root candidates that became roots after deletion
      for (const candidate of rootCandidates) {
        if (!covered.has(candidate.id)) {
          updatedRoots.push(candidate.id);
          covered.add(candidate.id);
          for (const m of candidate.marriages || []) {
            covered.add(m.spouseId);
          }
        }
      }

      return {
        ...prev,
        people: updatedPeople,
        rootIds: updatedRoots,
      };
    });
  };

  const addChild = (parentId: string, childData: AddChildData) => {
    const cleanName = childData.name.trim();
    if (!cleanName) return null;

    const parent = tree.people[parentId];
    if (!parent) return null;

    let childId = cleanName;
    if (tree.people[childId]) {
      let counter = 2;
      while (tree.people[`${cleanName} (${counter})`]) {
        counter++;
      }
      childId = `${cleanName} (${counter})`;
    }

    // Determine target marriage and spouse
    const targetMarriage = childData.spouseId
      ? parent.marriages.find(m => m.spouseId === childData.spouseId)
      : (parent.marriages.length > 0 ? parent.marriages[0] : undefined);

    const spouse = targetMarriage ? tree.people[targetMarriage.spouseId] : undefined;

    let fatherId: string | undefined;
    let motherId: string | undefined;

    if (parent.gender === 'male') {
      fatherId = parent.id;
      if (spouse && spouse.gender === 'female') {
        motherId = spouse.id;
      }
    } else if (parent.gender === 'female') {
      motherId = parent.id;
      if (spouse && spouse.gender === 'male') {
        fatherId = spouse.id;
      }
    } else {
      if (spouse?.gender === 'female') motherId = spouse.id;
      else if (spouse?.gender === 'male') fatherId = spouse.id;
    }

    const newChild: Person = {
      id: childId,
      name: cleanName,
      gender: childData.gender,
      birth: childData.birth,
      death: childData.death,
      village: childData.village,
      notes: childData.notes,
      isDeceased: checkIsDeceased(childData.death, childData.notes),
      fatherId,
      motherId,
      marriages: [],
      unassociatedChildren: [],
      customProperties: {},
    };

    setTree((prev) => {
      const currentParent = prev.people[parentId];
      if (!currentParent) return prev;

      const updatedPeople = { ...prev.people, [newChild.id]: newChild };
      const updatedParent = {
        ...currentParent,
        marriages: currentParent.marriages ? currentParent.marriages.map(m => ({ ...m, children: [...m.children] })) : [],
        unassociatedChildren: [...(currentParent.unassociatedChildren || [])],
      };

      const activeMarriage = childData.spouseId
        ? updatedParent.marriages.find(m => m.spouseId === childData.spouseId)
        : (updatedParent.marriages.length > 0 ? updatedParent.marriages[0] : undefined);

      if (activeMarriage) {
        if (!activeMarriage.children.includes(childId)) {
          activeMarriage.children.push(childId);
        }

        // Also sync reciprocal marriage on the spouse
        const targetSpouseId = activeMarriage.spouseId;
        if (targetSpouseId && updatedPeople[targetSpouseId]) {
          const currentSpouse = updatedPeople[targetSpouseId];
          const updatedSpouse = {
            ...currentSpouse,
            marriages: currentSpouse.marriages ? currentSpouse.marriages.map(m => ({ ...m, children: [...m.children] })) : [],
          };
          const reciprocalMarriage = updatedSpouse.marriages.find(m => m.spouseId === parentId);
          if (reciprocalMarriage) {
            if (!reciprocalMarriage.children.includes(childId)) {
              reciprocalMarriage.children.push(childId);
            }
          }
          updatedPeople[targetSpouseId] = updatedSpouse;
        }
      } else {
        // No marriage or child born without spouse
        if (!updatedParent.unassociatedChildren.includes(childId)) {
          updatedParent.unassociatedChildren.push(childId);
        }
      }

      updatedPeople[parentId] = updatedParent;

      return {
        ...prev,
        people: updatedPeople,
      };
    });

    return newChild;
  };

  const addSpouse = (personId: string, spouseData: AddSpouseData) => {
    const cleanName = spouseData.name.trim();
    if (!cleanName) return null;

    let spouseId = cleanName;
    if (tree.people[spouseId]) {
      let counter = 2;
      while (tree.people[`${cleanName} (${counter})`]) {
        counter++;
      }
      spouseId = `${cleanName} (${counter})`;
    }

    const newSpouse: Person = {
      id: spouseId,
      name: cleanName,
      gender: spouseData.gender,
      birth: spouseData.birth,
      death: spouseData.death,
      village: spouseData.village,
      notes: spouseData.notes,
      isDeceased: checkIsDeceased(spouseData.death, spouseData.notes),
      marriages: [
        {
          id: `m_${spouseId}_${personId}`,
          spouseId: personId,
          children: [],
        },
      ],
      unassociatedChildren: [],
      customProperties: {},
    };

    setTree((prev) => {
      const person = prev.people[personId];
      if (!person) return prev;

      const updatedPeople = { ...prev.people, [newSpouse.id]: newSpouse };
      const updatedPerson = { ...person };

      updatedPerson.marriages = [
        ...(updatedPerson.marriages || []),
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

    return newSpouse;
  };

  const addPerson = (data: { name: string; gender: Gender; birth?: string; death?: string; village?: string; notes?: string }) => {
    const cleanName = data.name.trim();
    if (!cleanName) return null;

    let id = cleanName;
    if (tree.people[id]) {
      let counter = 2;
      while (tree.people[`${cleanName} (${counter})`]) {
        counter++;
      }
      id = `${cleanName} (${counter})`;
    }

    const newPerson: Person = {
      id,
      name: cleanName,
      gender: data.gender,
      birth: data.birth,
      death: data.death,
      village: data.village,
      notes: data.notes,
      isDeceased: checkIsDeceased(data.death, data.notes),
      customProperties: {
        ...(newPersonCoords ? { _x: newPersonCoords.x.toString(), _y: newPersonCoords.y.toString() } : {})
      },
      marriages: [],
      unassociatedChildren: [],
    };
    
    setNewPersonCoords(null);

    setTree(prev => {
      const updatedPeople = { ...prev.people, [newPerson.id]: newPerson };
      const updatedRoots = prev.rootIds.includes(newPerson.id)
        ? prev.rootIds
        : [...prev.rootIds, newPerson.id];

      return {
        ...prev,
        people: updatedPeople,
        rootIds: updatedRoots,
      };
    });
    
    return newPerson;
  };

  return {
    tree,
    setTree,
    newPersonCoords,
    setNewPersonCoords,
    savePerson,
    deletePerson,
    addChild,
    addSpouse,
    addPerson,
  };
};
