import { test } from "node:test";
import assert from "node:assert/strict";
import { _resetStore } from "../src/store/contacts.js";
import {
  handleCreateContact,
  handleListContacts,
  handleUpdateContact,
} from "../src/api/contacts.js";

test("list contacts empty", () => {
  _resetStore();
  const res = handleListContacts();
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

test("create contact valid", () => {
  _resetStore();
  const res = handleCreateContact({ name: "Ada", email: "ada@example.com" });
  assert.equal(res.status, 201);
  assert.equal(res.body.email, "ada@example.com");
});

test("create contact rejects invalid email", () => {
  _resetStore();
  const res = handleCreateContact({ name: "Bad", email: "not-an-email" });
  assert.equal(res.status, 400);
});

test("update contact", () => {
  _resetStore();
  const created = handleCreateContact({ name: "Ada", email: "ada@example.com" });
  const res = handleUpdateContact(created.body.id, { name: "Augusta" });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, "Augusta");
});
