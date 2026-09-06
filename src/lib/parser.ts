import { FamilyTree, Person, Marriage, Gender } from '../types/family';
import { normalizeKey, normalizeGender } from './dictionary';
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
 * Computes English ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
 */
export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Generates an ID for an unknown spouse using person.id
 * e.g., 1st_wife_of_akkas-1 or 1st_husband_of_মেবেল মারাক
 */
export function generateUnknownSpouseId(person: Person, spouseIndex: number): string {
  const relation = person.gender === 'female' ? 'husband' : person.gender === 'male' ? 'wife' : 'spouse';
  return `${getOrdinal(spouseIndex)}_${relation}_of_${person.id}`;
}

/**
 * Creates or retrieves a person from the people map
 */
export function getOrCreatePerson(
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
  };

  people[id] = newPerson;
  return newPerson;
}

/**
 * Creates and registers a synthetic Unknown spouse for a parent
 */
export function createUnknownSpouse(
  people: Record<string, Person>,
  parent: Person,
  spouseIndex: number = parent.marriages.length + 1
): { spouse: Person; marriage: Marriage } {
  const spouseGender: Gender =
    parent.gender === 'female' ? 'male' :
    parent.gender === 'male' ? 'female' : 'other';

  const spouseId = generateUnknownSpouseId(parent, spouseIndex);

  const spouse = getOrCreatePerson(people, 'Unknown', spouseId);
  spouse.gender = spouseGender;

  let marriage = parent.marriages.find(m => m.spouseId === spouse.id);
  if (!marriage) {
    marriage = {
      id: `m_${parent.id}_${spouse.id}`,
      spouseId: spouse.id,
      children: [],
    };
    parent.marriages.push(marriage);
  }

  let reverseMarriage = spouse.marriages.find(m => m.spouseId === parent.id);
  if (!reverseMarriage) {
    reverseMarriage = {
      id: `m_${spouse.id}_${parent.id}`,
      spouseId: parent.id,
      children: marriage.children,
    };
    spouse.marriages.push(reverseMarriage);
  }

  return { spouse, marriage };
}

/**
 * Core Parser: Converts 2-Column Key-Value rows into an in-memory FamilyTree Graph
 */
export function parseKeyValueBlocksToTree(rows: RawRow[]): FamilyTree {
  const people: Record<string, Person> = {};
  let currentPerson: Person | null = null;
  let currentMarriage: Marriage | null = null;

  function finishCurrentPerson() {
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
        }
        break;
      }

      case 'father': {
        if (currentPerson && value) {
          const father = getOrCreatePerson(people, value);
          father.gender = 'male';
          currentPerson.fatherId = father.id;

          let targetMarriage: Marriage | undefined;
          if (currentPerson.motherId) {
            targetMarriage = father.marriages.find(m => m.spouseId === currentPerson!.motherId);
          }
          if (!targetMarriage && father.marriages.length > 0) {
            targetMarriage = father.marriages[0];
          }
          if (!targetMarriage) {
            const { marriage } = createUnknownSpouse(people, father);
            targetMarriage = marriage;
          }

          if (!targetMarriage.children.includes(currentPerson.id)) {
            targetMarriage.children.push(currentPerson.id);
          }
          if (!currentPerson.motherId) {
            currentPerson.motherId = targetMarriage.spouseId;
          }
        }
        break;
      }

      case 'mother': {
        if (currentPerson && value) {
          const mother = getOrCreatePerson(people, value);
          mother.gender = 'female';
          currentPerson.motherId = mother.id;

          let targetMarriage: Marriage | undefined;
          if (currentPerson.fatherId) {
            targetMarriage = mother.marriages.find(m => m.spouseId === currentPerson!.fatherId);
          }
          if (!targetMarriage && mother.marriages.length > 0) {
            targetMarriage = mother.marriages[0];
          }
          if (!targetMarriage) {
            const { marriage } = createUnknownSpouse(people, mother);
            targetMarriage = marriage;
          }

          if (!targetMarriage.children.includes(currentPerson.id)) {
            targetMarriage.children.push(currentPerson.id);
          }
          if (!currentPerson.fatherId) {
            currentPerson.fatherId = targetMarriage.spouseId;
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

          // If no active marriage in current block, create a new Unknown spouse!
          if (!currentMarriage) {
            const { marriage } = createUnknownSpouse(people, currentPerson);
            currentMarriage = marriage;
          }

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

