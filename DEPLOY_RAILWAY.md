# Squad 2 UAT Command Center - Railway Runbook

## 1. Railway variables

Set these variables on the `web-squad2` service:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
APP_USER=admin
APP_PASSWORD=<strong-password>
SESSION_SECRET=<long-random-secret>
APP_BASE_URL=https://<your-railway-domain>
GMAIL_SENDER_EMAIL=maitanthanh1998@gmail.com
GMAIL_OAUTH_CLIENT_ID=<google-oauth-client-id>
GMAIL_OAUTH_CLIENT_SECRET=<google-oauth-client-secret>
GMAIL_OAUTH_REDIRECT_URI=https://<your-railway-domain>/api/email-notifications/oauth/callback
GMAIL_TOKEN_ENCRYPTION_KEY=<separate-long-random-secret>
DEADLINE_MANAGER_EMAILS=yenuth@bidv.com.vn
DEADLINE_NOTIFICATION_SCHEDULER_ENABLED=true
DEADLINE_NOTIFICATION_RUN_UTC_HOUR=1
```

`APP_USER` and `APP_PASSWORD` seed the first real admin account in Postgres. `SESSION_SECRET` signs login cookies and should be a long random value.

## 2. Gmail deadline reminders

Create an OAuth client in Google Cloud before connecting `maitanthanh1998@gmail.com`:

1. Create or select a Google Cloud project and enable **Gmail API**.
2. Configure the OAuth consent screen and add `maitanthanh1998@gmail.com` as a test user while setting up. Before handover, change the publishing status to **In production**; an External app left in **Testing** receives a refresh token that expires after 7 days.
3. Create an OAuth Client ID of type **Web application**.
4. Add the exact authorized redirect URI shown above in `GMAIL_OAUTH_REDIRECT_URI`.
5. Set the Gmail variables on the web service.
6. Deploy, sign in with an admin account, open **Công việc > Thông tin đầu vào > Nhắc deadline qua Gmail**, then select **Kết nối Gmail**.
7. Send a test email and check the recent-send log on the same screen.

The refresh token is encrypted before it is stored in Postgres. Never commit the OAuth client secret, refresh token, or token encryption key.

The existing web service schedules the notification job itself. Set `DEADLINE_NOTIFICATION_SCHEDULER_ENABLED=true` and `DEADLINE_NOTIFICATION_RUN_UTC_HOUR=1`; 01:00 UTC is 08:00 in Vietnam. A deploy or restart after 08:00 schedules the first run for the next day, so it never sends a late duplicate immediately after startup.

The job sends one combined daily email per assignee for tasks in D-5 through D+3, and sends the manager digest only on Friday. Notification keys and a Postgres advisory lock prevent duplicate sends across retries or multiple web replicas. `npm run notify:deadlines` remains available as a manual one-shot fallback; do not schedule it in a second service while the in-process scheduler is enabled.

## 3. Deploy

Railway will detect `package.json` and run:

```bash
npm start
```

The app uses `railway.toml` with:

- start command: `npm start`
- health check path: `/api/health`
- restart policy: restart on failure

## 4. Verify after deploy

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

## 5. Move existing browser data into Postgres

If there is old local data in the browser:

1. Open the deployed Railway app from the same browser that had the old data.
2. If the DB is empty, the app will ask whether to move local browser data into Railway DB. Confirm it.
3. If you prefer manual migration, open the old app/session, click `Xuất`, then import that JSON in the Railway app.

The import replaces all current Railway DB data.

## 6. Production notes

- Do not commit `.env` or database credentials.
- Rotate the Postgres password if it was exposed in a screenshot or shared chat.
- Use the private Railway Postgres URL/reference for `DATABASE_URL`.
- Keep `/api/health` passing before handing over to users.
