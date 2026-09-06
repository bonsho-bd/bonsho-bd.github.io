import { FamilyTree, Person } from '../types/family';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Serializes a Person into 2-column Key-Value rows
 */
function serializePersonToRows(
  person: Person,
  people: Record<string, Person>,
  serializedMarriages: Set<string>
): [string, string][] {
  const rows: [string, string][] = [];

  rows.push(['Name', person.name]);
  if (person.id !== person.name) {
    rows.push(['Id', person.id]);
  }
  if (person.gender && person.gender !== 'other') {
    rows.push(['Gender', person.gender === 'male' ? 'Male' : 'Female']);
  }
  if (person.birth) {
    rows.push(['Date of birth', person.birth]);
  }
  if (person.death) {
    rows.push(['Date of death', person.death]);
  }

  // User-defined attributes (skip internal coordinates)
  for (const [key, val] of Object.entries(person.attributes || {})) {
    if (key.startsWith('_')) continue;
    rows.push([key, val]);
  }

  // Children without spouse
  for (const childId of person.unassociatedChildren) {
    const child = people[childId];
    if (child) {
      rows.push(['Child', child.name]);
    }
  }

  // Marriages and their grouped children (only serialized once per couple)
  for (const marriage of person.marriages) {
    const spouse = people[marriage.spouseId];
    if (spouse) {
      const pairKey = [person.id, spouse.id].sort().join(':::');
      if (serializedMarriages.has(pairKey)) {
        continue;
      }
      serializedMarriages.add(pairKey);

      const spouseKey = spouse.gender === 'female' ? 'Wife' : spouse.gender === 'male' ? 'Husband' : 'Spouse';
      rows.push([spouseKey, spouse.name]);

      for (const childId of marriage.children) {
        const child = people[childId];
        if (child) {
          rows.push(['Child', child.name]);
        }
      }
    }
  }

  return rows;
}

/**
 * Serializes entire FamilyTree into 2-column Key-Value format (separated by blank rows)
 */
export function treeToKeyValueRows(tree: FamilyTree): [string, string][] {
  const allRows: [string, string][] = [];
  const processedPeople = new Set<string>();
  const serializedMarriages = new Set<string>();

  // Process from roots downward (hierarchical order for pleasant reading)
  function traverse(personId: string) {
    if (processedPeople.has(personId)) return;
    processedPeople.add(personId);

    const person = tree.people[personId];
    if (!person) return;

    const personRows = serializePersonToRows(person, tree.people, serializedMarriages);
    allRows.push(...personRows);
    allRows.push(['', '']); // Blank row block separator

    // Traverse children
    for (const marriage of person.marriages) {
      for (const childId of marriage.children) {
        traverse(childId);
      }
    }
    for (const childId of person.unassociatedChildren) {
      traverse(childId);
    }
  }

  for (const rootId of tree.rootIds) {
    traverse(rootId);
  }

  // Traverse any remaining unvisited people
  for (const personId of Object.keys(tree.people)) {
    traverse(personId);
  }

  // Remove trailing blank row if any
  if (allRows.length > 0 && !allRows[allRows.length - 1][0] && !allRows[allRows.length - 1][1]) {
    allRows.pop();
  }

  return allRows;
}

/**
 * Generates CSV string from tree
 */
export function treeToCSV(tree: FamilyTree): string {
  const rows = treeToKeyValueRows(tree);
  return Papa.unparse(rows);
}

/**
 * Downloads the tree as an Excel (.xlsx) workbook
 */
export function downloadTreeAsExcel(tree: FamilyTree, filename = 'bonsho-family-tree.xlsx') {
  const rows = treeToKeyValueRows(tree);
  const worksheet = XLSX.utils.aoa_to_sheet([['Property', 'Value'], ...rows]);

  // Set column widths
  worksheet['!cols'] = [{ wch: 20 }, { wch: 35 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'FamilyTree');
  XLSX.writeFile(workbook, filename);
}

/**
 * Downloads the tree as a CSV file
 */
export function downloadTreeAsCSV(tree: FamilyTree, filename = 'bonsho-family-tree.csv') {
  const csv = treeToCSV(tree);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

