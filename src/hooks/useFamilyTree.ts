import { useState, useEffect } from 'react';
import { FamilyTree, Person, Gender, Marriage } from '../types/family';
import { createUnknownSpouse } from '../lib/parser';

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

export const useFamilyTree = () => {
  const [tree, setTree] = useState<FamilyTree>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse tree from local storage', e);
      }
    }
    return { people: {} };
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
        // Clean up marriages pointing to deleted spouse
        if (person.marriages) {
          const survivingMarriages: Marriage[] = [];
          person.marriages.forEach((marriage) => {
            if (marriage.spouseId === personId) {
              const remainingChildren = marriage.children.filter((childId) => childId !== personId);
              if (remainingChildren.length > 0) {
                // Synthesize an Unknown spouse to hold the remaining children with this person
                const { marriage: unknownMarriage } = createUnknownSpouse(
                  updatedPeople,
                  person
                );
                unknownMarriage.children = remainingChildren;
                survivingMarriages.push(unknownMarriage);
              }
            } else {
              // Remove deleted person from children list
              marriage.children = marriage.children.filter((id) => id !== personId);
              survivingMarriages.push(marriage);
            }
          });
          person.marriages = survivingMarriages;
        }
      });

      return {
        ...prev,
        people: updatedPeople,
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
    };

    setNewPersonCoords(null);

    setTree((prev) => {
      const updatedPeople: Record<string, Person> = { ...prev.people, [newPerson.id]: newPerson };

      if (input.relation?.type === 'child') {
        const parent = updatedPeople[input.relation.targetPersonId];
        if (parent) {
          const updatedParent = {
            ...parent,
            marriages: parent.marriages.map(m => ({ ...m, children: [...m.children] })),
          };

          let targetMarriage: Marriage | undefined;
          if (input.relation.spouseId) {
            targetMarriage = updatedParent.marriages.find(m => m.spouseId === input.relation!.spouseId);
          } else if (updatedParent.marriages.length > 0) {
            targetMarriage = updatedParent.marriages[0];
          }

          if (!targetMarriage) {
            const { marriage: unknownMarriage } = createUnknownSpouse(
              updatedPeople,
              updatedParent
            );
            targetMarriage = unknownMarriage;
          }

          if (!targetMarriage.children.includes(newPerson.id)) {
            targetMarriage.children.push(newPerson.id);
          }

          // Sync reciprocal marriage on spouse
          const spouse = updatedPeople[targetMarriage.spouseId];
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

          updatedPeople[parent.id] = updatedParent;
        }
      } else if (input.relation?.type === 'spouse') {
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
