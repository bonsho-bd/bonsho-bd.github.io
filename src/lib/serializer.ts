import { FamilyGraph, Person } from '../types/family';
import { computeRootIds } from './parser';
import Papa from 'papaparse';

/**
 * Serializes a Person into 2-column Key-Value rows
 */
function serializePersonToRows(
  person: Person,
  people: Record<string, Person>,
  serializedMarriages: Set<string>
): [string, string][] {
  const baseRows: [string, string][] = [
    ['Name', person.name],
    ...(person.id !== person.name ? [['Id', person.id] as [string, string]] : []),
    ...(person.gender ? [['Gender', person.gender === 'male' ? 'Male' : 'Female'] as [string, string]] : []),
    ...(person.birth ? [['Date of birth', person.birth] as [string, string]] : []),
    ...(person.death ? [['Date of death', person.death] as [string, string]] : []),
    ...Object.entries(person.attributes || {})
  ];

  const marriageRows = person.marriages.flatMap(marriage => {
    const spouse = people[marriage.spouseId];
    if (!spouse) return [];

    const pairKey = [person.id, spouse.id].sort().join(':::');
    if (serializedMarriages.has(pairKey)) return [];

    serializedMarriages.add(pairKey);
    const spouseKey = spouse.gender === 'female' ? 'Wife' : spouse.gender === 'male' ? 'Husband' : 'Spouse';

    const childrenRows = marriage.children
      .map(childId => people[childId])
      .filter((child): child is Person => child !== undefined)
      .map(child => ['Child', child.id] as [string, string]);

    return [['' + spouseKey, spouse.id] as [string, string], ...childrenRows];
  });

  return [...baseRows, ...marriageRows];
}

/**
 * Serializes entire FamilyGraph into 2-column Key-Value format (separated by blank rows)
 */
export function graphToKeyValueRows(graph: FamilyGraph): [string, string][] {
  const allRows: [string, string][] = [];
  const processedPeople = new Set<string>();
  const serializedMarriages = new Set<string>();

  // Process from roots downward (hierarchical order for pleasant reading)
  function traverse(personId: string) {
    if (processedPeople.has(personId)) return;
    processedPeople.add(personId);

    const person = graph.people[personId];
    if (!person) return;

    const personRows = serializePersonToRows(person, graph.people, serializedMarriages);
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
export function graphToCSV(graph: FamilyGraph): string {
  const rows = graphToKeyValueRows(graph);
  return Papa.unparse(rows);
}



