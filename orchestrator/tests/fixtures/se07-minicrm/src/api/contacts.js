import { isValidEmail } from "../validation/email.js";
import {
  createContact,
  getContact,
  listContacts,
  updateContact,
} from "../store/contacts.js";

export function handleCreateContact(body) {
  if (!body || typeof body !== "object") {
    return { status: 400, body: { error: "invalid payload" } };
  }
  if (!isValidEmail(body.email)) {
    return { status: 400, body: { error: "invalid email" } };
  }
  if (!body.name || String(body.name).trim() === "") {
    return { status: 400, body: { error: "name required" } };
  }
  const record = createContact(body);
  return { status: 201, body: record };
}

export function handleListContacts() {
  return { status: 200, body: listContacts() };
}

export function handleUpdateContact(id, patch) {
  if (patch?.email != null && !isValidEmail(patch.email)) {
    return { status: 400, body: { error: "invalid email" } };
  }
  const updated = updateContact(id, patch ?? {});
  if (!updated) return { status: 404, body: { error: "not found" } };
  return { status: 200, body: updated };
}

export function handleGetContact(id) {
  const c = getContact(id);
  if (!c) return { status: 404, body: { error: "not found" } };
  return { status: 200, body: c };
}
