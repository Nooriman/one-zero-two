/** Everyone documents can be about; must match FAMILY in the backend documents routes. */
export const FAMILY = [
  { id: "iman", label: "Iman" },
  { id: "lily", label: "Lily" },
  { id: "lola", label: "Lola", note: "Daughter" },
  { id: "luffy", label: "Luffy", note: "Son" },
] as const;

export type FamilyId = (typeof FAMILY)[number]["id"];
