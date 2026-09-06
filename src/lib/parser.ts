import { FamilyTree, Person, Marriage, Gender } from '../types/family';
import { normalizeKey, normalizeGender, checkIsDeceased } from './dictionary';
import Papa from 'papaparse';

interface RawRow {
  key: string;
  value: string;
}

/**
 * Parses raw text (pasted TSV from Google Sheets/Excel or CSV) into 2-column key-value pairs
 */
export function parseRawTextToRows(text: string): RawRow[] {
  const rows: RawRow[] = [];

  // PapaParse can automatically detect delimiter (tab vs comma vs semicolon)
  const parsed = Papa.parse<string[]>(text.trim(), {
    delimiter: '', // auto-detect
    skipEmptyLines: false, // we need blank lines to detect blocks
  });

  for (const line of parsed.data) {
    if (!line || line.length === 0 || (line.length === 1 && !line[0].trim())) {
      // Empty line / block separator
      rows.push({ key: '', value: '' });
      continue;
    }

    const key = (line[0] || '').trim();
    const value = (line[1] || '').trim();

    // Skip comment lines starting with // or #
    if (key.startsWith('//') || key.startsWith('#')) {
      continue;
    }

    rows.push({ key, value });
  }

  return rows;
}

/**
 * Creates or retrieves a person from the people map
 */
function getOrCreatePerson(
  people: Record<string, Person>,
  idOrName: string,
  explicitId?: string
): Person {
  const cleanName = idOrName.trim();
  const id = explicitId?.trim() || cleanName;

  if (people[id]) {
    return people[id];
  }

  // Check if someone with this name already exists without explicit ID
  const existingByName = Object.values(people).find(p => p.name.toLowerCase() === cleanName.toLowerCase());
  if (existingByName && !explicitId) {
    return existingByName;
  }

  const newPerson: Person = {
    id,
    name: cleanName,
    gender: 'other',
    attributes: {},
    marriages: [],
    unassociatedChildren: [],
  };

  people[id] = newPerson;
  return newPerson;
}

/**
 * Core Parser: Converts 2-Column Key-Value rows into an in-memory FamilyTree Graph
 */
export function parseKeyValueBlocksToTree(rows: RawRow[]): FamilyTree {
  const people: Record<string, Person> = {};
  let currentPerson: Person | null = null;
  let currentMarriage: Marriage | null = null;

  function finishCurrentPerson() {
    if (currentPerson) {
      currentPerson.isDeceased = checkIsDeceased(currentPerson.death);
    }
    currentPerson = null;
    currentMarriage = null;
  }

  for (let i = 0; i < rows.length; i++) {
    const { key: rawKey, value } = rows[i];

    // Blank row marks end of current block
    if (!rawKey && !value) {
      finishCurrentPerson();
      continue;
    }

    if (!rawKey && value) continue; // Malformed row

    const { canonical, original } = normalizeKey(rawKey);

    // If we encounter a Name or ID when we already have a person and this is a Name key,
    // start a new block even if there was no blank row
    if (canonical === 'name' && currentPerson !== null && currentPerson.name) {
      finishCurrentPerson();
    }

    switch (canonical) {
      case 'name': {
        const nameVal = value;
        // Peek ahead to see if the next row is an explicit 'id'
        let explicitId: string | undefined;
        if (i + 1 < rows.length) {
          const next = normalizeKey(rows[i + 1].key);
          if (next.canonical === 'id' && rows[i + 1].value) {
            explicitId = rows[i + 1].value;
          }
        }

        currentPerson = getOrCreatePerson(people, nameVal, explicitId);
        currentPerson.name = nameVal;
        break;
      }

      case 'id': {
        // If currentPerson exists and didn't have this ID, re-key if necessary
        if (currentPerson && value && currentPerson.id !== value) {
          const oldId = currentPerson.id;
          delete people[oldId];
          currentPerson.id = value;
          people[value] = currentPerson;
        }
        break;
      }

      case 'gender': {
        if (currentPerson) {
          currentPerson.gender = normalizeGender(value);
        }
        break;
      }

      case 'birth': {
        if (currentPerson) {
          currentPerson.birth = value;
        }
        break;
      }

      case 'death': {
        if (currentPerson) {
          currentPerson.death = value;
          currentPerson.isDeceased = true;
        }
        break;
      }

      case 'father': {
        if (currentPerson && value) {
          const father = getOrCreatePerson(people, value);
          father.gender = 'male';
          currentPerson.fatherId = father.id;
          if (!father.unassociatedChildren.includes(currentPerson.id)) {
            father.unassociatedChildren.push(currentPerson.id);
          }
        }
        break;
      }

      case 'mother': {
        if (currentPerson && value) {
          const mother = getOrCreatePerson(people, value);
          mother.gender = 'female';
          currentPerson.motherId = mother.id;
          if (!mother.unassociatedChildren.includes(currentPerson.id)) {
            mother.unassociatedChildren.push(currentPerson.id);
          }
        }
        break;
      }

      case 'spouse_female':
      case 'spouse_male':
      case 'spouse_any': {
        if (currentPerson && value) {
          const spouseGender: Gender =
            canonical === 'spouse_female' ? 'female' :
            canonical === 'spouse_male' ? 'male' :
            currentPerson.gender === 'male' ? 'female' :
            currentPerson.gender === 'female' ? 'male' : 'other';

          const spouse = getOrCreatePerson(people, value);
          if (spouse.gender === 'other') {
            spouse.gender = spouseGender;
          }

          // Check if marriage already recorded
          let marriage = currentPerson.marriages.find(m => m.spouseId === spouse.id);
          if (!marriage) {
            marriage = {
              id: `m_${currentPerson.id}_${spouse.id}`,
              spouseId: spouse.id,
              children: [],
            };
            currentPerson.marriages.push(marriage);
          }

          // Also record marriage on spouse side
          let reverseMarriage = spouse.marriages.find(m => m.spouseId === currentPerson!.id);
          if (!reverseMarriage) {
            reverseMarriage = {
              id: `m_${spouse.id}_${currentPerson.id}`,
              spouseId: currentPerson.id,
              children: marriage.children, // share same children reference
            };
            spouse.marriages.push(reverseMarriage);
          }

          currentMarriage = marriage;
        }
        break;
      }

      case 'child': {
        if (currentPerson && value) {
          const child = getOrCreatePerson(people, value);

          // Link parent references
          if (currentPerson.gender === 'male') {
            child.fatherId = currentPerson.id;
          } else if (currentPerson.gender === 'female') {
            child.motherId = currentPerson.id;
          }

          if (currentMarriage) {
            // Group under the active spouse!
            if (!currentMarriage.children.includes(child.id)) {
              currentMarriage.children.push(child.id);
            }
            const spouse = people[currentMarriage.spouseId];
            if (spouse) {
              if (spouse.gender === 'female' && !child.motherId) {
                child.motherId = spouse.id;
              } else if (spouse.gender === 'male' && !child.fatherId) {
                child.fatherId = spouse.id;
              }
            }
          } else {
            // Child before any declared spouse
            if (!currentPerson.unassociatedChildren.includes(child.id)) {
              currentPerson.unassociatedChildren.push(child.id);
            }
          }
        }
        break;
      }

      case 'custom':
      default: {
        if (currentPerson && original && value) {
          currentPerson.attributes[original] = value;
        }
        break;
      }
    }
  }

  finishCurrentPerson();

  // Find root ancestors: People who have no parents recorded in the tree
  const allPeopleList = Object.values(people);
  const rootCandidates = allPeopleList.filter(p => !p.fatherId && !p.motherId);

  // Support multiple roots: Include all root candidates while avoiding spouse duplication
  const rootIds: string[] = [];
  const coveredPeople = new Set<string>();

  for (const candidate of rootCandidates) {
    if (coveredPeople.has(candidate.id)) continue;
    rootIds.push(candidate.id);
    coveredPeople.add(candidate.id);
    for (const m of candidate.marriages) {
      coveredPeople.add(m.spouseId);
    }
  }

  return {
    people,
    rootIds,
  };
}

/**
 * Convenience helper: parse raw pasted string directly to FamilyTree
 */
export function parseRawText(text: string): FamilyTree {
  const rows = parseRawTextToRows(text);
  return parseKeyValueBlocksToTree(rows);
}

