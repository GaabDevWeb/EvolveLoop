/**
 * Brownfield MiniCRM store — contacts already list/create partially.
 * Email validation is intentionally incomplete until EngineeringWorker repairs it.
 */

const contacts = new Map();
let seq = 1;

export function listContacts() {
  return [...contacts.values()];
}

export function getContact(id) {
  return contacts.get(String(id)) ?? null;
}

export function createContact(input) {
  const id = String(seq++);
  const record = {
    id,
    name: String(input.name ?? ""),
    email: String(input.email ?? ""),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  contacts.set(id, record);
  return record;
}

export function updateContact(id, patch) {
  const cur = contacts.get(String(id));
  if (!cur) return null;
  const next = {
    ...cur,
    ...patch,
    id: cur.id,
    updatedAt: new Date().toISOString(),
  };
  contacts.set(cur.id, next);
  return next;
}

export function _resetStore() {
  contacts.clear();
  seq = 1;
}
