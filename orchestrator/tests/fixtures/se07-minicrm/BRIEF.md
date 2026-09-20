# SE-07 MiniCRM Brief / PRD

Build a small CRM API for contacts on top of the existing brownfield project.

Requirements:
- create contact;
- list contacts;
- update contact;
- reject invalid email;
- persist data;
- return appropriate HTTP status codes;
- include tests.

Constraints:
- existing project structure must be preserved;
- no new external service;
- use existing in-memory store layer;
- tests must run with npm test;
- desktop app is not part of MVP;
- api-only (no web frontend);
- auth not required for MVP;
- no unrestricted shell.

Technology:
- Node.js ESM
- local filesystem / in-memory persistence only
