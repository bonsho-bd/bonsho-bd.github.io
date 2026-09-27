import { FamilyGraph, Person } from '../types/family';
import { computeRootIds } from './parser';
import Papa from 'papaparse';
import { Language } from '../i18n/types';

/**
 * Serializes a Person into 2-column Key-Value rows
 */
function serializePersonToRows(
  person: Person,
  people: Record<string, Person>,
  serializedMarriages: Set<string>,
  lang: Language = 'en'
): [string, string][] {
  const isBn = lang === 'bn';

  const baseRows: [string, string][] = [
    [isBn ? 'নাম' : 'Name', person.name],
    ...(person.id !== person.name ? [[isBn ? 'আইডি' : 'Id', person.id] as [string, string]] : []),
    ...(person.gender ? [[isBn ? 'লিঙ্গ' : 'Gender', isBn ? (person.gender === 'male' ? 'পুরুষ' : 'নারী') : (person.gender === 'male' ? 'Male' : 'Female')] as [string, string]] : []),
    ...(person.birth ? [[isBn ? 'জন্ম' : 'Date of birth', person.birth] as [string, string]] : []),
    ...(person.death ? [[isBn ? 'মৃত্যু' : 'Date of death', person.death] as [string, string]] : []),
    ...Object.entries(person.attributes || {})
  ];

  const marriageRows = person.marriages.flatMap(marriage => {
    const spouse = people[marriage.spouseId];
    if (!spouse) return [];

    const pairKey = [person.id, spouse.id].sort().join(':::');
    if (serializedMarriages.has(pairKey)) return [];

    serializedMarriages.add(pairKey);
    let spouseKey: string;
    if (isBn) {
      spouseKey = spouse.gender === 'female' ? 'স্ত্রী' : spouse.gender === 'male' ? 'স্বামী' : 'জীবনসঙ্গী';
    } else {
      spouseKey = spouse.gender === 'female' ? 'Wife' : spouse.gender === 'male' ? 'Husband' : 'Spouse';
    }

    const childKey = isBn ? 'সন্তান' : 'Child';
    const childrenRows = marriage.children
      .map(childId => people[childId])
      .filter((child): child is Person => child !== undefined)
      .map(child => [childKey, child.id] as [string, string]);

    return [['' + spouseKey, spouse.id] as [string, string], ...childrenRows];
  });

  return [...baseRows, ...marriageRows];
}

/**
 * Serializes entire FamilyGraph into 2-column Key-Value format (separated by blank rows)
 */
export function graphToKeyValueRows(graph: FamilyGraph, lang: Language = 'en'): [string, string][] {
  const allRows: [string, string][] = [];
  const processedPeople = new Set<string>();
  const serializedMarriages = new Set<string>();

  // Process from roots downward (hierarchical order for pleasant reading)
  function traverse(personId: string) {
    if (processedPeople.has(personId)) return;
    processedPeople.add(personId);

    const person = graph.people[personId];
    if (!person) return;

    const personRows = serializePersonToRows(person, graph.people, serializedMarriages, lang);
    allRows.push(...personRows);
    allRows.push(['', '']); // Blank row block separator

    // Traverse children
    for (const marriage of person.marriages) {
      for (const childId of marriage.children) {
        traverse(childId);
      }
    }
  }

  const rootIds = computeRootIds(graph.people);
  for (const rootId of rootIds) {
    traverse(rootId);
  }

  // Traverse any remaining unvisited people
  for (const personId of Object.keys(graph.people)) {
    traverse(personId);
  }

  // Remove trailing blank row if any
  if (allRows.length > 0 && !allRows[allRows.length - 1][0] && !allRows[allRows.length - 1][1]) {
    allRows.pop();
  }

  return allRows;
}

/**
 * Generates CSV string from graph
 */
export function graphToCSV(graph: FamilyGraph, lang: Language = 'en'): string {
  const rows = graphToKeyValueRows(graph, lang);
  return Papa.unparse(rows);
}
