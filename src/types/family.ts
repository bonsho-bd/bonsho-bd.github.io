export type Gender = 'male' | 'female' | 'other';

export interface Marriage {
  id: string;
  spouseId: string;
  children: string[]; // Person IDs of children born to this marriage
}

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birth?: string;
  death?: string;
  isDeceased?: boolean;
  attributes: Record<string, string>;

  // Lineage connections
  fatherId?: string;
  motherId?: string;
  marriages: Marriage[];
  unassociatedChildren: string[]; // children born without a declared spouse
}

export interface FamilyTree {
  people: Record<string, Person>;
  rootIds: string[];
}

