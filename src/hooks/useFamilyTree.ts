import { useState, useEffect } from 'react';
import { FamilyTree, Person, Gender } from '../types/family';

const STORAGE_KEY = 'bonsho_family_tree_data';

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
      const updatedPeople = { ...prev.people };
      delete updatedPeople[personId];

      const updatedRoots = prev.rootIds.filter((id) => id !== personId);

      // Clean up references in other people
      Object.values(updatedPeople).forEach((person) => {
        if (person.marriages) {
          person.marriages.forEach((marriage) => {
            if (marriage.spouseId === personId) {
              marriage.spouseId = ''; // Or handle differently
            }
            marriage.children = marriage.children.filter((id) => id !== personId);
          });
        }
        if (person.unassociatedChildren) {
          person.unassociatedChildren = person.unassociatedChildren.filter((id) => id !== personId);
        }
      });

      return {
        ...prev,
        people: updatedPeople,
        rootIds: updatedRoots,
      };
    });
  };

  const addChild = (parentId: string, childData: { name: string; gender: Gender }) => {
    const cleanName = childData.name.trim();
    if (!cleanName) return;

    let childId = cleanName;
    if (tree.people[childId]) {
      let counter = 2;
      while (tree.people[`${cleanName} (${counter})`]) {
        counter++;
      }
      childId = `${cleanName} (${counter})`;
    }

    const newChild: Person = {
      id: childId,
      name: cleanName,
      gender: childData.gender,
      marriages: [],
      unassociatedChildren: [],
      customProperties: {},
    };

    setTree((prev) => {
      const parent = prev.people[parentId];
      if (!parent) return prev;

      const updatedPeople = { ...prev.people, [newChild.id]: newChild };
      const updatedParent = { ...parent };

      if (updatedParent.marriages && updatedParent.marriages.length > 0) {
        updatedParent.marriages[0].children = [
          ...updatedParent.marriages[0].children,
          childId,
        ];
      } else {
        updatedParent.unassociatedChildren = [
          ...(updatedParent.unassociatedChildren || []),
          childId,
        ];
      }

      updatedPeople[parentId] = updatedParent;

      // Ensure the other spouse also gets this child if they exist in the marriage
      if (updatedParent.marriages && updatedParent.marriages.length > 0) {
        const spouseId = updatedParent.marriages[0].spouseId;
        if (spouseId && updatedPeople[spouseId]) {
          const updatedSpouse = { ...updatedPeople[spouseId] };
          const marriageIndex = updatedSpouse.marriages?.findIndex(m => m.spouseId === parentId);
          if (marriageIndex !== undefined && marriageIndex > -1 && updatedSpouse.marriages) {
             updatedSpouse.marriages[marriageIndex].children = [
               ...updatedSpouse.marriages[marriageIndex].children,
               childId
             ];
             updatedPeople[spouseId] = updatedSpouse;
          }
        }
      }

      return {
        ...prev,
        people: updatedPeople,
      };
    });
  };

  const addSpouse = (personId: string, spouseData: { name: string; gender: Gender }) => {
    const cleanName = spouseData.name.trim();
    if (!cleanName) return;

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
      isDeceased: Boolean(data.death || (data.notes && (data.notes.includes('প্রয়াত') || data.notes.includes('মৃত') || data.notes.includes('মরহুম') || data.notes.includes('মরহুমা')))),
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
