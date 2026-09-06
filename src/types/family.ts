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
  attributes: Record<string, string>;

  marriages: Marriage[];
}

export interface FamilyTree {
  people: Record<string, Person>;
}

