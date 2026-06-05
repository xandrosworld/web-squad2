# Squad 2 UAT Command Center - Railway Runbook

## 1. Railway variables

Set these variables on the `web-squad2` service:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
APP_USER=admin
APP_PASSWORD=<strong-password>
SESSION_SECRET=<long-random-secret>
```

`APP_USER` and `APP_PASSWORD` seed the first real admin account in Postgres. `SESSION_SECRET` signs login cookies and should be a long random value.

## 2. Deploy

Railway will detect `package.json` and run:

```bash
npm start
```

The app uses `railway.toml` with:

- start command: `npm start`
- health check path: `/api/health`
- restart policy: restart on failure

## 3. Verify after deploy

Open:

```text
https://<your-railway-domain>/api/health
```

Expected:

```json
{
  "ok": true,
  "db": "online"
}
```

Then open the app and check the dashboard pill says `DB online`.

## 4. Move existing browser data into Postgres

If there is old local data in the browser:

1. Open the deployed Railway app from the same browser that had the old data.
2. If the DB is empty, the app will ask whether to move local browser data into Railway DB. Confirm it.
3. If you prefer manual migration, open the old app/session, click `Xuất`, then import that JSON in the Railway app.

The import replaces all current Railway DB data.

## 5. Production notes

- Do not commit `.env` or database credentials.
- Rotate the Postgres password if it was exposed in a screenshot or shared chat.
- Use the private Railway Postgres URL/reference for `DATABASE_URL`.
- Keep `/api/health` passing before handing over to users.
