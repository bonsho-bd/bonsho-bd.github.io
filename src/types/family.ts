export type Gender = 'male' | 'female';

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

export interface FamilyGraph {
  people: Record<string, Person>;
}

