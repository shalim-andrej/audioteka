"""Build an isolated catalog candidate. Never modifies or replaces the live database."""
import argparse, hashlib, json, os, re, shutil, sqlite3, sys, tempfile, time
import urllib.parse, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path

parser = argparse.ArgumentParser(description='Build a staged copy, never replace the source database.')
parser.add_argument('--source', type=Path, default=Path.home()/'Downloads'/'audiobooks-litres-full.db')
parser.add_argument('--directory', type=Path, default=Path.home()/'Downloads'/'audioteka-catalog-stage')
parser.add_argument('--fixture', type=Path, help='offline testing with local XML; never use for real catalog')
parser.add_argument('--fixture-min', type=int, default=1)
a=parser.parse_args()
source=a.source.resolve(); dest=a.directory.resolve(); stage=dest/'catalog-candidate.sqlite'; report=dest/'catalog-report.json'
if not source.is_file(): raise SystemExit('Source database not found.')
if source==stage or source.parent==dest: raise SystemExit('Source and staging paths must be separate.')
dest.mkdir(parents=True, exist_ok=True)
if shutil.disk_usage(dest).free < max(3*1024**3, source.stat().st_size*3): raise SystemExit('Not enough free disk space for safe staging (at least 3 GiB).')
for x in dest.glob('*.working'): raise SystemExit('Previous work file exists; inspect it before retrying.')
feed=dest/'feed.working'; work=dest/'catalog.working'; conn=None; source_db=None

def safe_url(s, hosts, requires_erid=False):
    try:
        u=urllib.parse.urlsplit(s or '')
        return s if u.scheme=='https' and u.hostname in hosts and not u.username and not u.password and (not requires_erid or bool(urllib.parse.parse_qs(u.query).get('erid'))) else None
    except Exception: return None

def txt(el,name):
    value=el.findtext(name)
    return (value or '').strip()

def fetch_feed():
    if a.fixture:
        shutil.copyfile(a.fixture,feed); return
    token=os.environ.get('ADVCAKE_API_PASS')
    if not token: raise ValueError('ADVCAKE_API_PASS missing')
    request='https://api.advcake.ru/feeds?'+urllib.parse.urlencode({'pass':token,'offer_id':957,'limit':100,'offset':0})
    with urllib.request.urlopen(request,timeout=30) as r: obj=json.load(r)
    if obj.get('success') is not True or not isinstance(obj.get('data'),list) or len(obj['data'])>=100: raise ValueError('Invalid feed list')
    matches=[f for f in obj['data'] if str(f.get('id'))=='65265' and str(f.get('offer_id'))=='957']
    if len(matches)!=1: raise ValueError('Saved audio feed is absent or ambiguous')
    url=safe_url(matches[0].get('url'),{'feeds.advcake.ru'})
    if not url: raise ValueError('Invalid feed download host')
    with urllib.request.urlopen(url,timeout=90) as r, open(feed,'xb') as f:
        if urllib.parse.urlsplit(r.geturl()).hostname != 'feeds.advcake.ru': raise ValueError('Unexpected feed redirect')
        total=0
        while True:
            data=r.read(1024*1024)
            if not data: break
            total+=len(data)
            if total>2*1024**3: raise ValueError('Feed exceeds size limit')
            f.write(data)
        length=r.headers.get('Content-Length')
        if length and total!=int(length): raise ValueError('Incomplete feed')

try:
    print('Downloading feed to isolated staging...')
    fetch_feed()
    with open(feed,'rb') as f:
        header=f.read(65536).upper()
        if b'<!DOCTYPE' in header or b'<!ENTITY' in header: raise ValueError('DTD and entities are not allowed')
    source_db=sqlite3.connect(source.as_uri()+'?mode=ro',uri=True)
    source_db.execute('PRAGMA query_only=ON')
    columns={r[1] for r in source_db.execute('PRAGMA table_info(books)')}
    needed={'id','title','author','narrator','genre','category_id','partner_url','fragment_url','price','clean'}
    if not needed.issubset(columns): raise ValueError('Unexpected books schema')
    if not {'id','parent_id','name'}.issubset({r[1] for r in source_db.execute('PRAGMA table_info(litres_categories)')}): raise ValueError('Unexpected categories schema')
    base_count=source_db.execute("SELECT COUNT(*) FROM books WHERE id LIKE 'litres-%'").fetchone()[0]
    before_comments=source_db.execute('SELECT COUNT(*) FROM comments').fetchone()[0]
    conn=sqlite3.connect(work)
    source_db.backup(conn); source_db.close(); source_db=None
    conn.execute('PRAGMA foreign_keys=ON')
    conn.execute('BEGIN IMMEDIATE')
    conn.execute('DROP TABLE IF EXISTS staged_feed_ids')
    conn.execute('CREATE TABLE staged_feed_ids(id TEXT PRIMARY KEY)')
    categories={}; seen=set(); counts={'offers':0,'eligible':0,'inserted':0,'updated':0,'skipped':0,'categories':0}
    stack=[]
    for ev,el in ET.iterparse(feed,events=('start','end')):
        if ev=='start': stack.append(el); continue
        if el.tag=='category' and len(stack)>1 and stack[-2].tag=='categories':
            cid=el.get('id',''); name=''.join(el.itertext()).strip(); parent=el.get('parentId') or None
            if cid and name and re.fullmatch(r'\d{1,16}',cid): categories[cid]=(name,parent)
            stack[-2].remove(el); el.clear()
        elif el.tag=='offer':
            counts['offers']+=1
            ident=el.get('id',''); fmt=txt(el,'format').lower(); cat=txt(el,'categoryId')
            link=safe_url(txt(el,'url'),{'litres.ru','www.litres.ru'},True)
            if not re.fullmatch(r'\d{1,16}',ident) or ident in seen or fmt!='mp3' or el.get('available','true').lower()!='true' or not link or not txt(el,'name') or cat not in categories:
                counts['skipped']+=1
            else:
                seen.add(ident); counts['eligible']+=1
                conn.execute('INSERT INTO staged_feed_ids(id) VALUES(?)',('litres-'+ident,))
                name=txt(el,'name'); author=txt(el,'author') or txt(el,'vendor') or 'Автор не указан'; narrator=txt(el,'performed_by'); description=txt(el,'description');
                picture=safe_url(txt(el,'picture'),{'cdn.litres.ru','www.litres.ru','litres.ru'})
                params={p.get('name'):''.join(p.itertext()).strip() for p in el.findall('param')}
                fragment=safe_url(params.get('fragment_url') or params.get('Фрагмент'),{'www.litres.ru','litres.ru'})
                try: seconds=max(0,round(float(params.get('duration_minutes','0'))*60))
                except ValueError: seconds=0
                duration=f'{seconds//3600} ч {(seconds%3600)//60} мин' if seconds else ''
                bookid='litres-'+ident
                exists=conn.execute('SELECT 1 FROM books WHERE id=?',(bookid,)).fetchone() is not None
                conn.execute('''INSERT INTO books(id,title,author,narrator,genre,description,short_description,cover_url,partner_url,fragment_url,price,category_id,duration_seconds,duration_formatted,clean,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,author=excluded.author,narrator=excluded.narrator,genre=excluded.genre,description=excluded.description,short_description=excluded.short_description,cover_url=excluded.cover_url,partner_url=excluded.partner_url,fragment_url=excluded.fragment_url,price=excluded.price,category_id=excluded.category_id,duration_seconds=excluded.duration_seconds,duration_formatted=excluded.duration_formatted''',
                (bookid,name,author,narrator,categories[cat][0],description,description[:200],picture,link,fragment,txt(el,'price'),cat,seconds,duration,int(time.time())))
                counts['updated' if exists else 'inserted']+=1
            stack[-2].remove(el); el.clear()
        stack.pop()
    min_required=a.fixture_min if a.fixture else max(100000,int(base_count*0.80))
    if counts['offers']<min_required or counts['eligible']<min_required or not categories: raise ValueError('Feed incomplete or too few eligible books; candidate discarded')
    conn.executemany('INSERT INTO litres_categories(id,parent_id,name) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id,name=excluded.name',[(id,parent,name) for id,(name,parent) in categories.items()])
    counts['categories']=len(categories)
    if conn.execute("SELECT 1 FROM sqlite_master WHERE name='books_fts' AND type='table'").fetchone(): conn.execute("INSERT INTO books_fts(books_fts) VALUES('rebuild')")
    after_comments=conn.execute('SELECT COUNT(*) FROM comments').fetchone()[0]
    if before_comments!=after_comments: raise ValueError('Comments count changed in snapshot')
    conn.commit()
    if conn.execute('PRAGMA quick_check').fetchone()[0]!='ok': raise ValueError('Candidate failed integrity check')
    conn.close();conn=None
    data={'checked_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'source_books':base_count,'comments_in_snapshot':before_comments,'counts':counts,'live_database_modified':False,'automatic_activation':False,'warning':'Snapshot is not ready to replace a live database: comments written after snapshot must be merged safely; unavailable books have not been removed.'}
    report_tmp=dest/'report.working';report_tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    os.replace(work,stage);os.replace(report_tmp,report)
    print('Candidate ready; live database unchanged. Feed offers:',counts['offers'],'eligible:',counts['eligible'],'inserted:',counts['inserted'],'updated:',counts['updated'])
except Exception as e:
    if conn:
        try: conn.rollback();conn.close()
        except Exception: pass
    if source_db: source_db.close()
    print('Staging failed; live database unchanged. Error type:',type(e).__name__,file=sys.stderr)
    sys.exit(1)
finally:
    for f in (feed,work,dest/'report.working'):
        try: f.unlink(missing_ok=True)
        except OSError: pass
