import { useState, useEffect } from 'react';
import { FamilyTree, Person, Gender, Marriage } from '../types/family';

const STORAGE_KEY = 'bonsho_family_tree_data';

export interface AddPersonInput {
  name: string;
  gender: Gender;
  birth?: string;
  death?: string;
  attributes?: Record<string, string>;
  relation?: {
    type: 'child' | 'spouse';
    targetPersonId: string;
    spouseId?: string;
  };
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

  const addPerson = (input: AddPersonInput): Person | null => {
    const cleanName = input.name.trim();
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
      gender: input.gender,
      birth: input.birth,
      death: input.death,
      attributes: {
        ...(input.attributes || {}),
        ...(newPersonCoords ? { _x: newPersonCoords.x.toString(), _y: newPersonCoords.y.toString() } : {})
      },
      marriages: [],
      unassociatedChildren: [],
    };

    setNewPersonCoords(null);

    setTree((prev) => {
      const updatedPeople: Record<string, Person> = { ...prev.people, [newPerson.id]: newPerson };
      let updatedRoots = [...prev.rootIds];

      if (!input.relation) {
        // Standalone / root person
        if (!updatedRoots.includes(newPerson.id)) {
          updatedRoots.push(newPerson.id);
        }
      } else if (input.relation.type === 'child') {
        const parent = updatedPeople[input.relation.targetPersonId];
        if (parent) {
          const updatedParent = {
            ...parent,
            marriages: parent.marriages.map(m => ({ ...m, children: [...m.children] })),
            unassociatedChildren: [...parent.unassociatedChildren],
          };

          const targetMarriage = input.relation.spouseId
            ? updatedParent.marriages.find(m => m.spouseId === input.relation!.spouseId)
            : (updatedParent.marriages.length > 0 ? updatedParent.marriages[0] : undefined);

          const spouse = targetMarriage ? updatedPeople[targetMarriage.spouseId] : undefined;

          // Set parent references on the child
          if (parent.gender === 'male') {
            newPerson.fatherId = parent.id;
            if (spouse && spouse.gender === 'female') {
              newPerson.motherId = spouse.id;
            }
          } else if (parent.gender === 'female') {
            newPerson.motherId = parent.id;
            if (spouse && spouse.gender === 'male') {
              newPerson.fatherId = spouse.id;
            }
          } else {
            if (spouse?.gender === 'female') newPerson.motherId = spouse.id;
            else if (spouse?.gender === 'male') newPerson.fatherId = spouse.id;
          }

          if (targetMarriage) {
            if (!targetMarriage.children.includes(newPerson.id)) {
              targetMarriage.children.push(newPerson.id);
            }

            // Sync reciprocal marriage on spouse
            if (spouse) {
              const updatedSpouse = {
                ...spouse,
                marriages: spouse.marriages.map(m => ({ ...m, children: [...m.children] })),
              };
              const reciprocal = updatedSpouse.marriages.find(m => m.spouseId === parent.id);
              if (reciprocal && !reciprocal.children.includes(newPerson.id)) {
                reciprocal.children.push(newPerson.id);
              }
              updatedPeople[spouse.id] = updatedSpouse;
            }
          } else {
            // Unassociated child
            if (!updatedParent.unassociatedChildren.includes(newPerson.id)) {
              updatedParent.unassociatedChildren.push(newPerson.id);
            }
          }

          updatedPeople[parent.id] = updatedParent;
        }
      } else if (input.relation.type === 'spouse') {
        const spouse = updatedPeople[input.relation.targetPersonId];
        if (spouse) {
          const updatedTargetSpouse = {
            ...spouse,
            marriages: [
              ...spouse.marriages,
              {
                id: `m_${spouse.id}_${newPerson.id}`,
                spouseId: newPerson.id,
                children: [],
              },
            ],
          };
          newPerson.marriages = [
            {
              id: `m_${newPerson.id}_${spouse.id}`,
              spouseId: spouse.id,
              children: [],
            },
          ];
          updatedPeople[spouse.id] = updatedTargetSpouse;
        }
      }

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
    addPerson,
  };
};
