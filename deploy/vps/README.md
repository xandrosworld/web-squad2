# Squad 2 VPS deployment

Production URL is https://squad2.xandrosworld.com.

The deployment directory is `/opt/squad2`. The Git release is extracted into its `app` subdirectory. Copy the Dockerfile, compose.yaml and .dockerignore from this directory into `/opt/squad2`.

`app.env` and `db.env` are root-readable runtime files created on the VPS. Keep the existing SESSION_SECRET and GMAIL_TOKEN_ENCRYPTION_KEY when updating so encrypted integrations remain usable. Set APP_BASE_URL and GMAIL_OAUTH_REDIRECT_URI to the production domain. Register the callback in the existing Google OAuth client.

Run `docker compose build web` then `docker compose up -d web` from `/opt/squad2`. The web service listens on 127.0.0.1:3102 behind Nginx. PostgreSQL 18 uses the named volume `squad2_postgres_data`.

The systemd backup timer runs daily at 02:30 Asia/Ho_Chi_Minh. Only `/opt/squad2/backups/latest.dump` is retained. A new dump must pass pg_restore --list before atomically replacing the previous backup. Check `systemctl status squad2-backup.timer` and `systemctl status squad2-backup.service`.

HTTPS uses an automatically renewed Let's Encrypt certificate and an Nginx reload hook. Check `systemctl status certbot.timer`.

During the 2026-11-07 cutover, source and destination fingerprints matched for all eight database tables. The Railway database was set to default_transaction_read_only=on and its email and Google Sheet schedules were disabled. All user updates should use the production URL above. Restoring Railway write access requires an administrative session with `PGOPTIONS=-c default_transaction_read_only=off` and `ALTER DATABASE railway RESET default_transaction_read_only`, after reconciling any newer VPS data.

Google Sheet source validation currently reports a missing required tester field. The same error was reproduced on Railway before cutover. Jira synchronization, Google Drive attachment download and Excel export passed live checks.
