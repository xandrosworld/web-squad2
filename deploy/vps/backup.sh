#!/bin/sh
set -eu
umask 077
cd /opt/squad2
exec 9>/run/lock/squad2-backup.lock
flock -n 9 || exit 0
file=/opt/squad2/backups/latest.dump
trap 'rm -f /opt/squad2/backups/latest.dump.tmp' EXIT HUP INT TERM
docker compose exec -T db pg_dump -U squad2 -d squad2 -Fc --no-owner --no-acl > "$file.tmp"
test -s "$file.tmp"
docker compose exec -T db pg_restore --list < "$file.tmp" > /dev/null
mv -f "$file.tmp" "$file"
echo "Backup completed $(date -Is)"
