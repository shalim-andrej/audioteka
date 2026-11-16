"""Transactionally apply catalog fields from a fresh candidate. Comments are never copied or replaced."""
import argparse, json, os, shutil, sqlite3, sys, time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,default=Path.home()/'Downloads'/'audiobooks-litres-full.db');p.add_argument('--directory',type=Path,default=Path.home()/'Downloads'/'audioteka-catalog-stage');p.add_argument('--test-allow-small',action='store_true');a=p.parse_args()
source=a.source.resolve();directory=a.directory.resolve();candidate=directory/'catalog-candidate.sqlite';report=directory/'catalog-report.json';backup_dir=directory/'backups'
if not source.is_file() or not candidate.is_file() or not report.is_file(): raise SystemExit('Source, candidate or report missing.')
if source==candidate: raise SystemExit('Source and candidate must be different.')
try:
 data=json.loads(report.read_text(encoding='utf8'));age=time.time()-candidate.stat().st_mtime
 if not 0<=age<=86400 or data.get('live_database_modified') is not False: raise ValueError('Candidate stale or report invalid')
 if shutil.disk_usage(directory).free < max(4*1024**3, source.stat().st_size*4): raise ValueError('Insufficient disk space for backup and transaction')
 check=sqlite3.connect(candidate.as_uri()+'?mode=ro',uri=True);check.execute('PRAGMA query_only=ON')
 staged=check.execute('select count(*) from staged_feed_ids').fetchone()[0]
 if staged!=data['counts']['eligible'] or staged < (1 if a.test_allow_small else 100000): raise ValueError('Candidate count mismatch')
 if check.execute('pragma quick_check').fetchone()[0]!='ok': raise ValueError('Candidate integrity failure')
 check.close()
 conn=sqlite3.connect(source,timeout=30,isolation_level=None);conn.execute('PRAGMA busy_timeout=30000');conn.execute('ATTACH DATABASE ? AS candidate',(str(candidate),))
 conn.execute('BEGIN IMMEDIATE')
 current=conn.execute("select count(*) from books where id like 'litres-%'").fetchone()[0]
 if not a.test_allow_small and staged < int(current*0.80): raise ValueError('Candidate is too small compared with source')
 comment_count=conn.execute('select count(*) from comments').fetchone()[0]
 backup_dir.mkdir(parents=True,exist_ok=True); backup_path=backup_dir/('audioteka-before-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'.sqlite')
 if backup_path.exists(): raise ValueError('Backup already exists')
 reader=sqlite3.connect(source.as_uri()+'?mode=ro',uri=True);backup=sqlite3.connect(backup_path)
 try: reader.backup(backup)
 finally: backup.close();reader.close()
 backup_check=sqlite3.connect(backup_path.as_uri()+'?mode=ro',uri=True)
 try:
  if backup_check.execute('pragma quick_check').fetchone()[0]!='ok' or backup_check.execute('select count(*) from comments').fetchone()[0]!=comment_count: raise ValueError('Backup verification failed')
 finally: backup_check.close()
 conn.execute('''INSERT INTO litres_categories(id,parent_id,name) SELECT id,parent_id,name FROM candidate.litres_categories WHERE 1 ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id,name=excluded.name''')
 conn.execute('''INSERT INTO books(id,title,author,narrator,genre,description,short_description,cover_url,partner_url,fragment_url,price,category_id,duration_seconds,duration_formatted,clean,created_at)
 SELECT b.id,b.title,b.author,b.narrator,b.genre,b.description,b.short_description,b.cover_url,b.partner_url,b.fragment_url,b.price,b.category_id,b.duration_seconds,b.duration_formatted,b.clean,b.created_at FROM candidate.books b JOIN candidate.staged_feed_ids s ON s.id=b.id WHERE 1
 ON CONFLICT(id) DO UPDATE SET title=excluded.title,author=excluded.author,narrator=excluded.narrator,genre=excluded.genre,description=excluded.description,short_description=excluded.short_description,cover_url=excluded.cover_url,partner_url=excluded.partner_url,fragment_url=excluded.fragment_url,price=excluded.price,category_id=excluded.category_id,duration_seconds=excluded.duration_seconds,duration_formatted=excluded.duration_formatted''')
 if conn.execute("select 1 from sqlite_master where type='table' and name='books_fts'").fetchone():conn.execute("INSERT INTO books_fts(books_fts) VALUES('rebuild')")
 if conn.execute('select count(*) from comments').fetchone()[0]!=comment_count: raise ValueError('Comments count changed')
 conn.commit();conn.close();print('Catalog applied transactionally. Comments preserved; backup:',backup_path)
except Exception as e:
 try: conn.rollback();conn.close()
 except Exception: pass
 print('Catalog apply failed; transaction rolled back. Error type:',type(e).__name__,file=sys.stderr);sys.exit(1)
