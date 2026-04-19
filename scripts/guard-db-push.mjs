const message = `
Refusing to run \`drizzle-kit push\` by default.

For production-safe schema changes, use:
1. pnpm db:generate
2. Review the SQL in db/migrations/
3. pnpm db:migrate

Only use direct schema push against a disposable database.
If you really want that, run:
  pnpm db:push:unsafe
`;

console.error(message.trim());
process.exit(1);
