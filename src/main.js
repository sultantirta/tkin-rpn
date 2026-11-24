import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import './style.css';
import writeXlsxFile from 'write-excel-file/browser';
import { TAHAP, JENIS, KEP, KEP_C, LAYAK_SURVEI, ST_DATA, ST_DATA_C, SOP_TAHAP, JENIS_DOK, DIR_DOK, DIVISI, ASPEK, ROLES, ROLENOTE, DATA_CONTOH, BLN, BLN_P, HARI, ROM, PIC, SEED } from './config.js';


/* ================= Utilitas ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const D=s=>new Date(s+'T00:00:00');
const addDays=(s,n)=>{const d=D(s);d.setDate(d.getDate()+n);return iso(d)};
const diff=(a,b)=>Math.round((D(b)-D(a))/864e5);
const fmt=s=>{if(!s)return '—';const d=D(s);return d.getDate()+' '+BLN[d.getMonth()]+' '+d.getFullYear()};
const fmtS=s=>{if(!s)return '—';const d=D(s);return d.getDate()+' '+BLN[d.getMonth()]};
const dec=(v,n)=>v==null||isNaN(v)?'—':v.toFixed(n==null?1:n).replace('.',',');
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const TODAY=iso(new Date());
/* Tema tampilan: 'terang' atau 'neon'; pilihan disimpan per browser */
const SKIN_KEY='tkin-tampilan';
let SKIN=(()=>{try{const v=localStorage.getItem(SKIN_KEY);if(v==='terang'||v==='neon')return v}catch(_){}try{return matchMedia('(prefers-color-scheme: dark)').matches?'neon':'terang'}catch(_){return 'terang'}})();
document.documentElement.dataset.skin=SKIN;
const skinHTML=()=>`<div class="skin" role="group" aria-label="Tampilan"><button type="button" data-act="skin" data-v="terang" aria-pressed="${SKIN==='terang'}">Light</button><button type="button" data-act="skin" data-v="neon" aria-pressed="${SKIN==='neon'}">Dark</button></div>`;
const NOWY=TODAY.slice(0,4);
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const opt=(v,l,cur)=>`<option value="${esc(v)}"${String(cur)===String(v)?' selected':''}>${esc(l)}</option>`;
const initials=n=>String(n||'').replace(/\b(Dr|Ir|Prof|H)\.\s*/g,'').split(',')[0].trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();

/* ================= State ================= */
const S={role:'admin',year:DATA_CONTOH?'Semua':NOWY,view:'ringkasan',open:null,resp:null,respDone:false,
  K:[],DT:[],R:[],SOP:[],A:[],SV:[],LOG:[],
  reg:{q:'',jenis:'',tahap:'',pemohon:'',status:'',page:1},
  rekF:'',dataF:'',sopF:'',svF:'',
  ars:{q:'',jenis:'',page:1},
  ex:{ds:'erin',y:NOWY,m:String(+TODAY.slice(5,7))},
  auth:null,gate:'pilih',
  /* Daftar isian yang bisa ditambah admin dari form */
  M:{divisi:DIVISI.map(d=>d.slice()),jenis:JENIS.slice(),jenisDok:JENIS_DOK.slice(),orang:DATA_CONTOH?[...PIC,'Nur Aisyah, S.P.','Yudi Prasetyo, M.Sc.']:[]}
};
const divName=k=>{const d=S.M.divisi.find(x=>x[0]===k);return d?d[1]:(k||'—')};
const noK=k=>k&&k.nomor?k.nomor:'Belum bernomor';
/* Prototipe: kode akses contoh. Di versi jadi disimpan terpisah dan tidak tampil di halaman. */
const ADMINS=[1,2,3,4,5].map(i=>({kode:'TKIN-ADMIN'+i,nama:'Admin Sekretariat '+i}));
/* Penyimpanan uji coba: isian disimpan di browser penguji (localStorage). Versi jadi memakai database bersama. */
const STORE='tkin-ujicoba-v1';let canStore=!DATA_CONTOH;
const M0=JSON.parse(JSON.stringify(S.M));
function save(){if(DATA_CONTOH)return;try{localStorage.setItem(STORE,JSON.stringify({v:1,K:S.K,DT:S.DT,R:S.R,SOP:S.SOP,A:S.A,SV:S.SV,LOG:S.LOG,M:S.M}))}catch(_){canStore=false}}
function load(){try{const r=localStorage.getItem(STORE);if(!r)return;const d=JSON.parse(r);['K','DT','R','SOP','A','SV','LOG'].forEach(k=>{if(Array.isArray(d[k]))S[k]=d[k]});if(d.M)Object.keys(S.M).forEach(k=>{if(Array.isArray(d.M[k]))S.M[k]=d.M[k]})}catch(_){canStore=false}}
function resetData(){['K','DT','R','SOP','A','SV','LOG'].forEach(k=>{S[k]=[]});S.M=JSON.parse(JSON.stringify(M0));try{localStorage.removeItem(STORE)}catch(_){}}
const byId=id=>S.K.find(k=>k.id===id);
const kno=id=>{const k=byId(id);return k?k.nomor:''};
const isAdmin=()=>S.role==='admin';
const inYear=d=>S.year==='Semua'||(d||'').slice(0,4)===S.year;
const kList=()=>S.K.filter(k=>!k.deleted&&inYear(k.tglTugas));
const liveRef=id=>!id||(byId(id)&&!byId(id).deleted);
const svOf=kid=>S.SV.find(s=>s.kajian===kid);
const eligible=k=>!!(k&&k.rek&&LAYAK_SURVEI.includes(k.rek.keputusan));
const svStatus=s=>!s?'Belum dibuat':s.status==='Ditutup'?'Ditutup':s.resp.length?'Sudah direspons':'Menunggu respons';
const SV_C={'Belum dibuat':'var(--line-2)','Menunggu respons':'var(--warn)','Sudah direspons':'var(--ok)','Ditutup':'var(--muted)'};
const lastUpd=k=>k.riwayat[k.riwayat.length-1].tgl;

/* ================= Data contoh ================= */
const yearCount={};
function autoNo(d){const y=(d||TODAY).slice(0,4);yearCount[y]=(yearCount[y]||0)+1;return `KJ-${String(yearCount[y]).padStart(3,'0')}/TKIN/${y}`}
function log(aksi,ref,t,byMe){const n=new Date();const me=S.auth?S.auth.name:ROLES[S.role];S.LOG.push({id:uid('l'),t:t||TODAY,w:t?'':pad(n.getHours())+'.'+pad(n.getMinutes()),role:t&&!byMe?ROLES.admin:me,aksi,ref:ref||''});save()}
const FAKE='https://drive.google.com/… (contoh)';
const svUrl=tok=>`…/exec?survei=${tok}`;

function seed(){
  /* Data contoh digeser mengikuti tanggal hari ini agar demo selalu terlihat baru */
  const SH=diff('2026-11-18',TODAY);const sd=t=>t?addDays(t,SH):t;
  SEED.forEach(x=>{x.d=sd(x.d);if(x.tgt)x.tgt=sd(x.tgt)});
  const G=[10,12,14,10,7,8,15];const idx=[];
  SEED.map((x,i)=>Object.assign({i},x)).sort((a,b)=>a.d.localeCompare(b.d)).forEach(x=>{
    const g=x.g||G;const riw=[{tahap:0,tgl:x.d}];let t=x.d;
    for(let s=1;s<=x.tp;s++){t=addDays(t,g[s-1]||10);if(t>TODAY)t=TODAY;riw.push({tahap:s,tgl:t})}
    const no=autoNo(x.d),y=x.d.slice(0,4);
    const k={id:uid('k'),nomor:no,judul:x.j,jenis:x.t,pemohon:x.pm,sumber:x.s,
      dasar:`Disposisi No. ${110+yearCount[y]*7}/DIR/${ROM[+x.d.slice(5,7)-1]}/${y}`,
      tglTugas:x.d,target:x.tgt||'',tahap:x.tp,statusKhusus:x.sk||'',pic:PIC[x.p],
      anggota:[PIC[(x.p+1)%6],PIC[(x.p+3)%6]],
      ringkasan:`Permohonan dari ${divName(x.pm)}. TKIN menelaah dasar ketentuan, data pendukung dari unit terkait, dan pilihan kebijakan sebagai bahan rekomendasi kepada Direksi.`,
      linkFolder:FAKE,riwayat:riw,rek:null,deleted:false};
    if(x.tp>=6){const r6=riw[6].tgl;k.rek={tglSampai:r6,noSurat:`M-${no.slice(3,6)}/TKIN/${ROM[+r6.slice(5,7)-1]}/${r6.slice(0,4)}`,ringkasan:x.rek||'',keputusan:x.kep||'Belum diputuskan',tglKeputusan:x.tp>=7?riw[7].tgl:'',tindakLanjut:x.tl||''}}
    S.K.push(k);idx[x.i]=k;
    log('Kajian didaftarkan',k.id,x.d);
    riw.slice(1).forEach(r=>log(`Tahap diubah ke “${TAHAP[r.tahap]}”`,k.id,r.tgl));
    if(k.rek&&k.rek.keputusan!=='Belum diputuskan')log(`Keputusan Direksi dicatat: ${k.rek.keputusan}`,k.id,k.rek.tglKeputusan);
    const nm=x.j.replace(/^Kajian /,'');
    const ad=(jenis,nama,tgl,v)=>S.A.push({id:uid('a'),nama,jenis,kajian:k.id,tgl,versi:v||'1',link:FAKE});
    ad('Surat','Surat permohonan dan disposisi – '+nm,x.d);
    if(x.tp>=1)ad('Data Pendukung','Kompilasi data – '+nm,riw[1].tgl);
    if(x.tp>=2)ad('Notulensi','Notulensi rapat pembahasan – '+nm,riw[2].tgl);
    if(x.tp>=3)ad('Working Paper','Working paper – '+nm,riw[3].tgl,'1');
    if(x.tp>=5)ad('Working Paper','Working paper final – '+nm,riw[5].tgl,'3');
    if(x.tp>=6){ad('Hasil Kajian','Laporan hasil kajian – '+nm,riw[6].tgl,'Final');ad('Bahan Paparan','Bahan paparan Direksi – '+nm,riw[6].tgl,'Final')}
  });
  const K=i=>idx[i].id;
  [[12,'Data biaya produksi pupuk hayati 2024–2026','PPBBI','2026-10-06','Diterima sebagian'],
   [12,'Harga produk sejenis di pasar','Div. Komersial','2026-10-06','Diminta'],
   [13,'Rekap realisasi biaya perjalanan dinas riset 2025','Div. Keuangan','2026-11-12','Diminta'],
   [13,'Ketentuan perjalanan dinas yang berlaku','Div. Hukum','2026-10-20','Lengkap'],
   [9,'Data peserta dan biaya pelatihan tiga tahun terakhir','Div. SDM','2026-08-10','Lengkap'],
   [9,'Perbandingan tarif pelatihan lembaga lain','Div. Komersial','2026-09-20','Diterima sebagian'],
   [14,'Data biaya produksi biofungisida','PPBBI','2026-11-03','Diminta'],
   [15,'SOP komersialisasi versi yang berlaku','Div. Komersial','2026-11-10','Diminta'],
   [8,'Daftar luas dan lokasi kebun percobaan','Div. Operasional Riset','2026-07-14','Lengkap'],
   [11,'Daftar paten dan HKI terdaftar','Div. Hukum','2026-09-10','Diterima sebagian'],
   [5,'Rekap proses pengadaan bahan penelitian 2025','Div. Pengadaan','2026-05-26','Lengkap'],
   [6,'Peta tanah dan curah hujan calon lahan','PPKS','2026-05-28','Lengkap']
  ].forEach(([i,u,unit,t0,st])=>{const t=sd(t0);S.DT.push({id:uid('d'),kajian:K(i),uraian:u,unit:divName(unit),narahubung:'',tglMinta:t,status:st,tglTerima:st==='Lengkap'?addDays(t,9):'',link:st==='Diminta'?'':FAKE,catatan:''})});
  [[14,'Rapat awal penugasan kajian harga biofungisida',1,'09.00–11.00','Offline','Ruang Rapat Lt. 2','Terjadwal',[]],
   [12,'Pembahasan data biaya produksi pupuk hayati',3,'13.30–15.00','Online','Zoom Meeting','Terjadwal',[]],
   [15,'Rapat awal review SOP komersialisasi',8,'09.00–10.30','Hybrid','Ruang Rapat Direktorat RIS','Terjadwal',[]],
   [9,'Pembahasan skema tarif pelatihan',-2,'09.00–11.30','Offline','Ruang Rapat Lt. 2','Selesai',[['Lengkapi perbandingan tarif dari tiga lembaga','Budi Santoso',false],['Susun simulasi tarif per paket pelatihan','Sari Lestari',false]]],
   [13,'Pembahasan awal kebijakan perjalanan dinas',-7,'13.00–15.00','Online','Zoom Meeting','Selesai',[['Minta rekap realisasi perjalanan dinas ke Divisi Keuangan','Sekretariat',true],['Petakan ketentuan yang perlu diperbarui','Rina Maharani',false]]],
   [5,'Review draft SOP pengadaan bersama Divisi Pengadaan',-14,'10.00–12.00','Offline','Ruang Rapat Direktorat RIS','Selesai',[['Revisi alur persetujuan pada draft SOP','Dewi Puspitasari',false]]],
   [7,'Pembahasan tanggapan Direksi atas kajian harga bibit tebu',-25,'14.00–15.30','Hybrid','Ruang Rapat Direksi','Selesai',[['Kirim bahan paparan final ke Sekretaris Perusahaan','Sekretariat',true]]],
   [4,'Finalisasi draft kebijakan kerja sama riset',-40,'09.00–12.00','Offline','Ruang Rapat Lt. 2','Selesai',[['Masukkan tanggapan Divisi Hukum ke draft final','Hendra Gunawan',false]]]
  ].forEach(([i,ag,off,jam,mode,tempat,st,tl])=>{const tgl=addDays(TODAY,off);
    S.R.push({id:uid('r'),kajian:K(i),agenda:ag,tgl,jam,mode,tempat,peserta:'Ketua, anggota TKIN, dan perwakilan '+divName(idx[i].pemohon),status:st,linkUndangan:FAKE,linkNotulensi:st==='Selesai'?FAKE:'',tl:tl.map(([u,p,done])=>({id:uid('t'),u,p,tenggat:'',done}))});
    if(st==='Selesai')S.A.push({id:uid('a'),nama:'Notulensi – '+ag,jenis:'Notulensi',kajian:K(i),tgl,versi:'1',link:FAKE});
  });
  [['SOP-PGD-01','SOP','SOP Pengadaan Bahan dan Alat Penelitian','Div. Pengadaan',2,3,'',5],
   ['IK-LAB-04','IK','IK Pengelolaan Sampel Laboratorium','PPBBI',4,2,'2026-10-01',10],
   ['SOP-KOM-02','SOP','SOP Komersialisasi Produk Hasil Riset','Div. Komersial',0,0,'',15],
   ['SOP-KSR-01','SOP','SOP Kerja Sama Riset','Div. Operasional Riset',3,4,'',4],
   ['IK-KBN-01','IK','IK Pemanfaatan Kebun Percobaan','Div. Operasional Riset',1,1,'',8],
   ['SOP-HRG-01','SOP','SOP Penetapan Harga Produk Hasil Riset','Div. Komersial',4,1,'2026-06-15',null]
  ].forEach(([nomor,jenis,judul,unit,tahap,revisi,tglBerlaku,ki])=>S.SOP.push({id:uid('s'),nomor,jenis,judul,pemohon:unit,tahap,revisi,tglBerlaku:sd(tglBerlaku),kajian:ki==null?'':K(ki),link:FAKE}));
  /* Survei kepuasan */
  const sv=(i,tok,off,penerima,resp,status)=>{const k=idx[i];const d=addDays(k.rek.tglKeputusan,off);
    S.SV.push({id:uid('v'),kajian:k.id,token:tok,dibuat:d,penerima,status:status||'Aktif',resp:resp.map(([o,nama,jab,a,ov,saran])=>({id:uid('p'),tgl:addDays(d,o),nama,jabatan:jab,a:{a1:a[0],a2:a[1],a3:a[2],a4:a[3],a5:a[4]},ov,saran}))});
    log(`Link survei kepuasan dibuat (${tok})`,k.id,d);
  };
  sv(0,'SV-7K3QX',4,'Kepala Bagian Pemuliaan, PPKS',[[3,'M. Fauzi','Kepala Bagian Pemuliaan',[5,4,4,3,5],4,'Simulasi harga per wilayah sangat membantu. Lampiran data pembanding sebaiknya lebih ringkas.'],[6,'','Staf Pemasaran Benih',[4,4,5,4,4],4,'Rekomendasi jelas dan mudah dijelaskan ke pelanggan.']]);
  sv(1,'SV-M4R8T',3,'Manajer Komersialisasi',[[2,'Larasati W.','Manajer Komersialisasi',[5,5,4,4,5],5,'Daftar tarif langsung bisa kami pakai untuk penawaran ke mitra.']]);
  sv(10,'SV-H2W9P',5,'Kepala Laboratorium PPBBI',[]);
  sv(16,'SV-Q6D3N',5,'Kepala Bagian Komersial, PPTK',[[8,'Agus Permana','Kepala Bagian Komersial',[4,3,4,3,4],4,'Perlu pembahasan lanjutan untuk harga klon jenis baru.']],'Ditutup');
}

/* ================= Komponen ================= */
const pie=f=>{if(f<=0)return '';if(f>=1)return '<circle cx="8" cy="8" r="3.6" fill="currentColor"/>';const a=2*Math.PI*f,x=8+3.6*Math.sin(a),y=8-3.6*Math.cos(a);return `<path d="M8 8 L8 4.4 A3.6 3.6 0 ${f>.5?1:0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z" fill="currentColor"/>`};
function ring(t,n,col){const done=t>=n-1;return `<svg class="ring" viewBox="0 0 16 16" aria-hidden="true" style="color:${col}">${done?'<circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5 8.2l2 2 4-4.2" fill="none" stroke="var(--on-ink)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>':`<circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"${t===0?' stroke-dasharray="2 1.6"':''}/>${pie(t/(n-1))}`}</svg>`}
const tahapCol=k=>k.statusKhusus?'var(--muted)':k.tahap===0?'var(--muted)':k.tahap<6?'var(--warn)':k.tahap===6?'var(--info)':'var(--accent)';
const stTahap=k=>`<span class="st">${ring(k.tahap,8,tahapCol(k))}<span>${TAHAP[k.tahap]}</span><span class="mono">${k.tahap+1}/8</span></span>`;
const decTag=(t,c)=>`<span class="dec" style="--c:${c}"><i></i>${esc(t)}</span>`;
const kepTag=k=>decTag(k,KEP_C[k]||'var(--muted)');
const svTag=s=>decTag(svStatus(s),SV_C[svStatus(s)]);
const who=n=>n?`<span class="who"><span class="av" aria-hidden="true">${esc(initials(n))}</span>${esc(n)}</span>`:'—';
const flink=(label,v)=>v?`<button type="button" class="lnk" data-act="fake">${esc(label)}</button>`:'<span class="muted">—</span>';
const kajianLink=id=>{const k=byId(id);if(!k)return '<span class="muted">—</span>';return `<button type="button" class="lnk mono" style="color:var(--ink)" data-act="open" data-id="${k.id}">${esc(noK(k))}</button>`};
function pager(total,page,per,key){const pages=Math.max(1,Math.ceil(total/per));if(total<=per)return `<div class="pager"><span>${total} data</span></div>`;
  let b='';for(let p=1;p<=pages;p++)b+=`<button type="button" data-act="page" data-s="${key}" data-p="${p}" aria-current="${p===page}">${p}</button>`;
  return `<div class="pager"><span>${(page-1)*per+1}–${Math.min(total,page*per)} dari ${total}</span><div><button type="button" data-act="page" data-s="${key}" data-p="${page-1}" ${page<=1?'disabled':''} aria-label="Sebelumnya">‹</button>${b}<button type="button" data-act="page" data-s="${key}" data-p="${page+1}" ${page>=pages?'disabled':''} aria-label="Berikutnya">›</button></div></div>`}
function dotsScore(v){if(v==null)return '';let h='';for(let i=1;i<=5;i++){const f=Math.max(0,Math.min(1,v-(i-1)));h+=f>=1?'<i class="on"></i>':f>0?`<i class="half" style="--f:${Math.round(f*100)}%"></i>`:'<i></i>'}return `<div class="dots" aria-hidden="true">${h}</div>`}
const svScore=s=>mean(s.resp.map(r=>r.ov));
function svSet(K){const ids=new Set(K.map(k=>k.id));const L=S.SV.filter(s=>ids.has(s.kajian));const R=L.flatMap(s=>s.resp.map(r=>({r,s})));
  return {L,R,avg:mean(R.map(x=>x.r.ov)),asp:ASPEK.map(([k])=>mean(R.map(x=>x.r.a[k]).filter(v=>v))),answered:L.filter(s=>s.resp.length).length,ready:K.filter(k=>eligible(k)&&!svOf(k.id)).length,divs:new Set(R.map(x=>byId(x.s.kajian).pemohon)).size}}

/* ================= Navigasi ================= */
const IC={
  ringkasan:'<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/>',
  register:'<path d="M6 4h7.5M6 8h7.5M6 12h7.5M2.5 4h.5M2.5 8h.5M2.5 12h.5"/>',
  rekomendasi:'<path d="M3 8.5l3 3 7-7"/>',
  survei:'<path d="M2.5 11.5a5.5 5.5 0 0 1 11 0"/><path d="M8 11.5l2.6-3.2"/><path d="M2.5 13.5h11"/>',
  data:'<ellipse cx="8" cy="4" rx="5" ry="1.8"/><path d="M3 4v8c0 1 2.2 1.8 5 1.8s5-.8 5-1.8V4M3 8c0 1 2.2 1.8 5 1.8s5-.8 5-1.8"/>',
  rapat:'<rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/>',
  sop:'<path d="M4 2.5h5l3 3v8H4z"/><path d="M9 2.5v3h3M6 9h4M6 11h3"/>',
  arsip:'<rect x="2" y="3" width="12" height="3" rx=".6"/><path d="M3 6v7h10V6M6.5 9h3"/>',
  ekspor:'<path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10"/>'
};
const VIEWS={
  ringkasan:{t:'Ringkasan',s:r=>r==='direksi'?'Posisi kajian, hasil, dan kepuasan pemohon.':'Gambaran pekerjaan Tim Kajian Internal dan sekretariat.',fn:vRingkasan},
  register:{t:'Register Kajian',s:()=>'Semua kajian dari permohonan divisi sampai keputusan Direksi.',fn:vRegister,after:renderRegTable,acts:()=>isAdmin()?'<button type="button" class="btn pri" data-act="newKajian">Kajian baru</button>':''},
  rekomendasi:{t:'Hasil & Rekomendasi',s:()=>'Rekomendasi yang disampaikan ke Direksi dan keputusannya.',fn:vRek},
  survei:{t:'Survei Kepuasan',s:()=>'Penilaian divisi pemohon atas hasil kajian yang diterima Direksi.',fn:vSurvei},
  data:{t:'Permintaan Data',s:()=>'Kebutuhan data kajian yang diminta ke unit kerja.',fn:vData,acts:()=>isAdmin()?'<button type="button" class="btn pri" data-act="newData">Catat permintaan</button>':''},
  rapat:{t:'Rapat & Tindak Lanjut',s:()=>'Jadwal rapat, notulensi, dan butir tindak lanjut.',fn:vRapat,acts:()=>isAdmin()?'<button type="button" class="btn pri" data-act="newRapat">Jadwalkan rapat</button>':''},
  sop:{t:'SOP & Instruksi Kerja',s:()=>'SOP dan IK perusahaan yang sedang atau sudah dikaji TKIN.',fn:vSop,acts:()=>isAdmin()?'<button type="button" class="btn pri" data-act="newSop">Tambah SOP / IK</button>':''},
  arsip:{t:'Arsip Dokumen',s:r=>r==='direksi'?'Laporan hasil kajian dan bahan paparan.':'Working paper, notulensi, data pendukung, dan hasil kajian.',fn:vArsip,after:renderArsTable,acts:()=>isAdmin()?'<button type="button" class="btn pri" data-act="newArsip">Tambah dokumen</button>':''},
  ekspor:{t:'Ekspor & Evidence',s:()=>'Unduh data untuk laporan dan evidence bulanan.',fn:vEkspor,after:renderExPrev}
};
const ACCESS={admin:Object.keys(VIEWS),direksi:['ringkasan','register','rekomendasi','survei','arsip']};
function counts(){const K=kList();
  return {register:K.length,rekomendasi:K.filter(k=>k.rek&&k.rek.keputusan==='Belum diputuskan').length,survei:K.filter(k=>eligible(k)&&!svOf(k.id)).length,
    data:S.DT.filter(d=>!d.deleted&&liveRef(d.kajian)&&inYear(d.tglMinta)&&d.status!=='Lengkap').length,
    rapat:S.R.filter(r=>!r.deleted&&liveRef(r.kajian)&&inYear(r.tgl)).reduce((a,r)=>a+r.tl.filter(t=>!t.done).length,0)}}
function renderNav(){
  const c=counts(),acc=ACCESS[S.role];
  const tip={register:'kajian',rekomendasi:'menunggu keputusan',survei:'siap disurvei',data:'belum lengkap',rapat:'tindak lanjut terbuka'};
  const item=id=>acc.includes(id)?`<a href="#${id}"${S.view===id?' aria-current="page"':''}><svg viewBox="0 0 16 16" aria-hidden="true">${IC[id]}</svg><span>${VIEWS[id].t}</span>${c[id]?`<em title="${c[id]} ${tip[id]}">${c[id]}</em>`:''}</a>`:'';
  const ops=['data','rapat','sop','arsip'].filter(i=>acc.includes(i));
  $('#nav').innerHTML=item('ringkasan')+'<div class="ng">Kajian</div>'+item('register')+item('rekomendasi')+item('survei')
    +(ops.length?'<div class="ng">Sekretariat</div>'+ops.map(item).join(''):'')+(acc.includes('ekspor')?'<div class="ng">Laporan</div>'+item('ekspor'):'');
}

/* ================= Ringkasan ================= */
function vRingkasan(){
  if(!S.K.some(k=>!k.deleted))return vKosong();
  const K=kList(),dir=S.role==='direksi';
  const aktif=K.filter(k=>k.statusKhusus!=='Dibatalkan');
  const berjalan=aktif.filter(k=>k.tahap<6);
  const ditunda=berjalan.filter(k=>k.statusKhusus==='Ditunda').length;
  const samp=K.filter(k=>k.tahap>=6&&k.rek);
  const tunggu=samp.filter(k=>k.rek.keputusan==='Belum diputuskan');
  const putus=samp.filter(k=>k.rek.keputusan!=='Belum diputuskan');
  const durs=samp.map(k=>{const r=k.riwayat.find(x=>x.tahap===6);return r?diff(k.tglTugas,r.tgl):null}).filter(x=>x!==null);
  const avg=durs.length?Math.round(mean(durs)):null;
  const sv=svSet(K);
  const yrTxt=S.year==='Semua'?'Sejak register dimulai':`Sepanjang ${S.year}`;
  let h=`<section class="hero"><p class="lede"><span>${yrTxt}, TKIN menerima</span> ${K.length} permohonan kajian<span>.</span> ${berjalan.length} masih berjalan<span>,</span> ${tunggu.length} menunggu keputusan Direksi<span>, dan</span> ${putus.length} sudah diputuskan<span>.</span></p>
  <div class="sat"><div class="l">Kepuasan divisi pemohon</div><div class="v">${dec(sv.avg)}<small>/5</small></div>${dotsScore(sv.avg)}<div class="f">${sv.R.length?`${sv.R.length} respons dari ${sv.divs} divisi`:'Belum ada respons survei'} · <a href="#survei">lihat survei</a></div></div></section>`;
  h+=`<section class="kpis" aria-label="Angka utama">
    <div class="kpi"><span class="l">Total kajian</span><span class="v">${K.length}</span><span class="f">${S.year==='Semua'?'semua tahun':'penugasan '+S.year}</span></div>
    <div class="kpi"><span class="l">Sedang berjalan</span><span class="v">${berjalan.length}</span><span class="f">${ditunda?ditunda+' ditunda':'di tahap 1–6'}</span></div>
    <div class="kpi"><span class="l">Menunggu keputusan</span><span class="v">${tunggu.length}</span><span class="f">sudah di Direksi</span></div>
    <div class="kpi"><span class="l">Sudah diputuskan</span><span class="v">${putus.length}</span><span class="f">${putus.filter(k=>LAYAK_SURVEI.includes(k.rek.keputusan)).length} diterima</span></div>
    <div class="kpi"><span class="l">Rata-rata waktu kajian</span><span class="v">${avg===null?'—':avg}<small>${avg===null?'':'hari'}</small></span><span class="f">penugasan → disampaikan</span></div>
  </section>`;
  const cnt=TAHAP.map((_,i)=>aktif.filter(k=>k.tahap===i).length);const mx=Math.max(1,...cnt);
  h+=`<div class="pgrp" aria-hidden="true"><span>Proses di TKIN</span><span>Di Direksi</span></div><nav class="pipe" aria-label="Kajian per tahap">${TAHAP.map((t,i)=>`<button type="button" class="pcol${cnt[i]?'':' zero'}${i>=6?' dir':''}" data-act="goTahap" data-i="${i}" aria-label="${t}: ${cnt[i]} kajian"><span class="pn">${pad(i+1)}</span><span class="pv">${cnt[i]}</span><span class="pb"><i style="width:${cnt[i]/mx*100}%"></i></span><span class="pl">${t}</span></button>`).join('')}</nav>`;

  const tungguBlk=`<section class="blk"><div class="bh"><h2>Menunggu keputusan Direksi</h2><span class="m">${tunggu.length} kajian</span></div>${tunggu.length?`<ul class="rows">${tunggu.sort((a,b)=>a.rek.tglSampai.localeCompare(b.rek.tglSampai)).map(k=>`<li><button type="button" class="rowbtn" data-act="open" data-id="${k.id}"><div class="t">${esc(k.judul)}</div><div class="s"><span class="mono">${esc(noK(k))}</span> · ${esc(k.pemohon)} · disampaikan ${fmt(k.rek.tglSampai)}</div>${k.rek.ringkasan?`<div class="q">${esc(k.rek.ringkasan)}</div>`:''}</button></li>`).join('')}</ul>`:'<div class="empty">Tidak ada rekomendasi yang menunggu keputusan.</div>'}</section>`;
  const byDiv=S.M.divisi.map(([kd])=>({kd,n:K.filter(k=>k.pemohon===kd).length,d:K.filter(k=>k.pemohon===kd&&k.tahap>=6).length})).filter(x=>x.n).sort((a,b)=>b.n-a.n);
  const mxd=Math.max(1,...byDiv.map(x=>x.n));
  const divBlk=`<section class="blk"><div class="bh"><h2>Permohonan per divisi</h2><span class="m">${byDiv.length} divisi</span></div>${byDiv.length?`<div class="bars">${byDiv.slice(0,7).map(x=>`<div class="br"><div class="h"><span>${esc(x.kd)} <span class="muted">· ${esc(divName(x.kd))}</span></span><b>${x.n}</b></div><div class="tr"><i style="width:${x.n/mxd*100}%"></i></div></div>`).join('')}</div>`:'<div class="empty">Belum ada permohonan.</div>'}</section>`;
  if(dir){
    const hasil=putus.slice().sort((a,b)=>(b.rek.tglKeputusan||'').localeCompare(a.rek.tglKeputusan||''));
    h+=`<div class="cols c2e">${tungguBlk}<section class="blk"><div class="bh"><h2>Hasil kajian terbaru</h2><span class="m"><a href="#rekomendasi">semua hasil</a></span></div>${hasil.length?`<ul class="rows">${hasil.slice(0,5).map(k=>`<li><button type="button" class="rowbtn" data-act="open" data-id="${k.id}"><div class="t">${esc(k.judul)}</div><div class="s">${kepTag(k.rek.keputusan)} · ${fmt(k.rek.tglKeputusan)} · ${esc(k.pemohon)}</div></button></li>`).join('')}</ul>`:'<div class="empty">Belum ada keputusan.</div>'}</section></div>`;
    h+=`<div class="cols c2e"><section class="blk"><div class="bh"><h2>Penilaian per aspek</h2><span class="m">skala 1–5</span></div>${aspekBars(sv)}</section>${divBlk}</div>`;
    return h;
  }
  const up=S.R.filter(r=>!r.deleted&&liveRef(r.kajian)&&r.status==='Terjadwal'&&r.tgl>=TODAY).sort((a,b)=>a.tgl.localeCompare(b.tgl));
  const tl=S.R.filter(r=>!r.deleted&&liveRef(r.kajian)&&inYear(r.tgl)).flatMap(r=>r.tl.filter(t=>!t.done).map(t=>({t,r})));
  h+=`<div class="cols c3">${tungguBlk}
   <section class="blk"><div class="bh"><h2>Rapat mendatang</h2><span class="m"><a href="#rapat">semua rapat</a></span></div>${up.length?`<ul class="rows">${up.slice(0,4).map(r=>{const d=D(r.tgl);return `<li><div class="day"><b>${d.getDate()}</b><span>${BLN[d.getMonth()]}</span><span>${HARI[d.getDay()].slice(0,3)}</span></div><div class="g"><div class="t">${esc(r.agenda)}</div><div class="s">${esc(r.jam)} · ${esc(r.mode)} · ${esc(r.tempat)}</div></div></li>`}).join('')}</ul>`:'<div class="empty">Belum ada rapat terjadwal.</div>'}</section>
   <section class="blk"><div class="bh"><h2>Tindak lanjut rapat</h2><span class="m">${tl.length} terbuka</span></div>${tl.length?`<ul class="tl">${tl.slice(0,5).map(({t,r})=>tlItem(t,r)).join('')}</ul>`:'<div class="empty">Semua tindak lanjut selesai.</div>'}</section></div>`;
  const dl=S.DT.filter(d=>!d.deleted&&liveRef(d.kajian)&&inYear(d.tglMinta)&&d.status!=='Lengkap').sort((a,b)=>a.tglMinta.localeCompare(b.tglMinta));
  h+=`<div class="cols c2"><section class="blk"><div class="bh"><h2>Permintaan data belum lengkap</h2><span class="m"><a href="#data">${dl.length} permintaan</a></span></div>${dl.length?`<ul class="rows">${dl.slice(0,5).map(d=>`<li><div class="g"><div class="t">${esc(d.uraian)}</div><div class="s">${esc(d.unit)} · diminta ${fmt(d.tglMinta)} · <span class="mono">${esc(kno(d.kajian))}</span></div></div>${decTag(d.status,ST_DATA_C[d.status])}</li>`).join('')}</ul>`:'<div class="empty">Semua data yang diminta sudah lengkap.</div>'}</section>${divBlk}</div>`;
  const lg=S.LOG.filter(l=>liveRef(l.ref)).slice().sort((a,b)=>(b.t+b.w).localeCompare(a.t+a.w)).slice(0,8);
  h+=`<section class="blk"><div class="bh"><h2>Aktivitas terbaru</h2><span class="m">riwayat perubahan</span></div><table class="log"><tbody>${lg.map(l=>`<tr><td class="mono">${fmtS(l.t)}${l.w?' '+l.w:''}</td><td>${esc(l.aksi)}</td><td class="muted">${esc(l.role)}</td><td>${l.ref?kajianLink(l.ref):''}</td></tr>`).join('')}</tbody></table></section>`;
  return h;
}
function vKosong(){const adm=isAdmin();
  return `<section class="welcome"><p class="eyebrow-s">Belum ada data</p><h2>Register kajian masih kosong.</h2><p class="wl">${adm?'Mulai uji coba dengan mendaftarkan kajian pertama. Urutan yang disarankan:':'Admin belum memasukkan kajian. Ringkasan akan terisi setelah admin mengisi data.'}</p>${adm?`<ol class="wsteps"><li><b>Daftarkan kajian</b> lewat tombol di bawah atau menu Register Kajian.</li><li><b>Catat permintaan data dan rapat</b> untuk kajian itu.</li><li><b>Pindahkan tahap</b> sampai “Disampaikan ke Direksi”, lalu catat keputusannya.</li><li><b>Buat link survei</b> bila keputusannya Diterima, lalu coba isi formulirnya.</li><li><b>Unduh evidence laporan</b> di menu Ekspor.</li></ol><div class="btnrow"><button type="button" class="btn pri" data-act="newKajian">Daftarkan kajian pertama</button></div><p class="hint">${canStore?'Data uji coba tersimpan di browser ini saja. Admin lain tidak melihat isian Anda.':'Browser ini tidak mengizinkan penyimpanan, jadi isian hilang saat halaman dimuat ulang.'}</p>`:''}</section>`}
function aspekBars(sv){return sv.R.length?`<div class="bars">${ASPEK.map(([k,l],i)=>{const v=sv.asp[i];return `<div class="br" style="--c:var(--accent)"><div class="h"><span>${l}</span><b>${dec(v)}</b></div><div class="tr"><i style="width:${(v||0)/5*100}%"></i></div></div>`}).join('')}</div>`:'<div class="empty">Belum ada respons survei.</div>'}
function tlItem(t,r){return `<li class="${t.done?'done':''}"><input type="checkbox" id="tl-${t.id}" data-chg="tl" data-r="${r.id}" data-t="${t.id}" ${t.done?'checked':''} ${isAdmin()?'':'disabled'}><div><label class="u" for="tl-${t.id}">${esc(t.u)}</label><div class="s">${esc(t.p||'—')}${t.tenggat?` · tenggat ${fmt(t.tenggat)}`:''} · rapat ${fmtS(r.tgl)}</div></div></li>`}

/* ================= Register ================= */
function vRegister(){
  const f=S.reg;const used=[...new Set(S.K.filter(k=>!k.deleted).map(k=>k.pemohon).filter(Boolean))];
  return `<div class="tools">
    <input class="in grow" id="reg-q" data-inp="regq" type="search" placeholder="Cari nomor, judul, PIC, atau divisi pemohon" aria-label="Cari kajian" value="${esc(f.q)}">
    <select class="in" data-chg="reg" data-k="pemohon" aria-label="Divisi pemohon"><option value="">Semua divisi pemohon</option>${S.M.divisi.filter(d=>used.includes(d[0])).map(d=>opt(d[0],d[0]+' · '+d[1],f.pemohon)).join('')}</select>
    <select class="in" data-chg="reg" data-k="jenis" aria-label="Jenis kajian"><option value="">Semua jenis</option>${S.M.jenis.map(j=>opt(j,j,f.jenis)).join('')}</select>
    <select class="in" data-chg="reg" data-k="tahap" aria-label="Tahap"><option value="">Semua tahap</option>${TAHAP.map((t,i)=>opt(String(i),(i+1)+'. '+t,f.tahap)).join('')}</select>
    <select class="in" data-chg="reg" data-k="status" aria-label="Status khusus"><option value="">Semua status</option>${opt('aktif','Tanpa status khusus',f.status)}${opt('Ditunda','Ditunda',f.status)}${opt('Dibatalkan','Dibatalkan',f.status)}</select>
  </div><div id="reg-body"></div>`;
}
function renderRegTable(){
  const f=S.reg;let K=kList();
  if(f.q){const q=f.q.toLowerCase();K=K.filter(k=>[k.nomor,k.judul,k.pic,k.sumber,(k.anggota||[]).join(' '),k.pemohon,divName(k.pemohon)].join(' ').toLowerCase().includes(q))}
  if(f.pemohon)K=K.filter(k=>k.pemohon===f.pemohon);
  if(f.jenis)K=K.filter(k=>k.jenis===f.jenis);
  if(f.tahap!=='')K=K.filter(k=>String(k.tahap)===f.tahap);
  if(f.status==='aktif')K=K.filter(k=>!k.statusKhusus);else if(f.status)K=K.filter(k=>k.statusKhusus===f.status);
  K.sort((a,b)=>b.tglTugas.localeCompare(a.tglTugas)||(b.nomor||'').localeCompare(a.nomor||''));
  const per=10,pages=Math.max(1,Math.ceil(K.length/per));if(f.page>pages)f.page=pages;
  const rows=K.slice((f.page-1)*per,f.page*per);
  const el=$('#reg-body');if(!el)return;
  el.innerHTML=K.length?`<div class="wrap"><table class="tbl"><thead><tr><th>Nomor</th><th>Kajian</th><th>Divisi pemohon</th><th>Tahap</th><th>Ketua / PIC</th><th>Penugasan</th><th>Diperbarui</th></tr></thead><tbody>${rows.map(k=>`<tr class="click" data-act="open" data-id="${k.id}" tabindex="0"><td><span class="mono" style="color:var(--ink)">${esc(noK(k))}</span></td><td><div class="t1">${esc(k.judul)}</div><div class="t2">${esc(k.jenis)}${k.statusKhusus?` · <b style="color:var(--warn);font-weight:500">${esc(k.statusKhusus)}</b>`:''}${k.rek&&k.rek.keputusan!=='Belum diputuskan'?' · '+esc(k.rek.keputusan):''}</div></td><td><span title="${esc(divName(k.pemohon))}">${esc(k.pemohon||'—')}</span></td><td>${stTahap(k)}</td><td>${who(k.pic)}</td><td class="num muted">${fmt(k.tglTugas)}</td><td class="num muted">${fmt(lastUpd(k))}</td></tr>`).join('')}</tbody></table></div>${pager(K.length,f.page,per,'reg')}`:'<div class="empty">Tidak ada kajian yang cocok dengan filter. <button type="button" class="lnk" data-act="resetReg">Hapus filter</button></div>';
}

/* ================= Rekomendasi ================= */
function vRek(){
  const K=kList().filter(k=>k.rek);
  let L=K;if(S.rekF)L=L.filter(k=>k.rek.keputusan===S.rekF);
  L=L.slice().sort((a,b)=>b.rek.tglSampai.localeCompare(a.rek.tglSampai));
  const tabs=`<div class="tabs" role="group" aria-label="Saring keputusan"><button type="button" data-act="rekF" data-v="" aria-pressed="${S.rekF===''}">Semua <em>${K.length}</em></button>${KEP.map(x=>`<button type="button" data-act="rekF" data-v="${x}" aria-pressed="${S.rekF===x}">${x} <em>${K.filter(k=>k.rek.keputusan===x).length}</em></button>`).join('')}</div>`;
  return tabs+(L.length?`<div class="reclist">${L.map(k=>{const s=svOf(k.id);return `<article class="rec"><div class="a"><span class="mono" style="color:var(--ink)">${esc(noK(k))}</span><span>Disampaikan ${fmt(k.rek.tglSampai)}</span><span>${esc(k.rek.noSurat||'')}</span></div>
    <div><h3><button type="button" class="rowbtn" data-act="open" data-id="${k.id}"><span class="t">${esc(k.judul)}</span></button></h3><div class="t2 muted" style="font-size:12.5px;margin-top:3px">Pemohon: ${esc(divName(k.pemohon))}</div>${k.rek.ringkasan?`<p>${esc(k.rek.ringkasan)}</p>`:'<p class="muted">Ringkasan rekomendasi belum diisi.</p>'}<div class="ft">${flink('Laporan hasil kajian',1)}${isAdmin()?`<button type="button" class="btn sm" data-act="rekForm" data-id="${k.id}">Catat keputusan</button>`:''}</div></div>
    <div class="c">${kepTag(k.rek.keputusan)}<span class="s">${k.rek.tglKeputusan?'Diputuskan '+fmt(k.rek.tglKeputusan):'Belum ada tanggal keputusan'}</span>${k.rek.tindakLanjut?`<span>${esc(k.rek.tindakLanjut)}</span>`:''}${eligible(k)?`<span class="s">Survei: ${svTag(s)}${s&&s.resp.length?` · ${dec(svScore(s))}/5`:''}</span>`:''}</div></article>`}).join('')}</div>`:'<div class="empty">Belum ada rekomendasi dengan keputusan ini.</div>');
}

/* ================= Survei ================= */
function vSurvei(){
  const K=kList();const sv=svSet(K);const adm=isAdmin();
  const E=K.filter(eligible);
  const rate=sv.L.length?Math.round(sv.answered/sv.L.length*100):null;
  let h=`<section class="kpis" aria-label="Ringkasan survei">
    <div class="kpi"><span class="l">Skor kepuasan rata-rata</span><span class="v">${dec(sv.avg)}<small>/5</small></span><span class="f">dari pertanyaan keseluruhan</span></div>
    <div class="kpi"><span class="l">Survei dikirim</span><span class="v">${sv.L.length}</span><span class="f">${E.length} kajian layak disurvei</span></div>
    <div class="kpi"><span class="l">Respons masuk</span><span class="v">${sv.R.length}</span><span class="f">dari ${sv.divs} divisi</span></div>
    <div class="kpi"><span class="l">Tingkat respons</span><span class="v">${rate==null?'—':rate}<small>${rate==null?'':'%'}</small></span><span class="f">survei yang sudah diisi</span></div>
    <div class="kpi"><span class="l">Siap disurvei</span><span class="v">${sv.ready}</span><span class="f">link belum dibuat</span></div>
  </section>`;
  const order=s=>({'Belum dibuat':0,'Menunggu respons':1,'Sudah direspons':2,'Ditutup':3})[s];
  let L=E.slice();if(S.svF)L=L.filter(k=>svStatus(svOf(k.id))===S.svF);
  L.sort((a,b)=>order(svStatus(svOf(a.id)))-order(svStatus(svOf(b.id)))||(b.rek.tglKeputusan||'').localeCompare(a.rek.tglKeputusan||''));
  const sts=['Belum dibuat','Menunggu respons','Sudah direspons','Ditutup'];
  h+=`<div class="cols c2" style="grid-template-columns:minmax(0,8fr) minmax(0,4fr)"><section class="blk" style="min-width:0">
    <div class="tabs" role="group" aria-label="Saring status survei"><button type="button" data-act="svF" data-v="" aria-pressed="${S.svF===''}">Semua <em>${E.length}</em></button>${sts.map(x=>`<button type="button" data-act="svF" data-v="${x}" aria-pressed="${S.svF===x}">${x} <em>${E.filter(k=>svStatus(svOf(k.id))===x).length}</em></button>`).join('')}</div>
    ${L.length?`<div class="wrap"><table class="tbl"><thead><tr><th>Kajian</th><th>Pemohon</th><th>Survei</th><th class="r">Respons</th><th class="r">Skor</th><th></th></tr></thead><tbody>${L.map(k=>{const s=svOf(k.id);return `<tr><td><div class="t1" style="min-width:220px">${esc(k.judul)}</div><div class="t2"><span class="mono">${esc(noK(k))}</span> · ${esc(k.rek.keputusan)} ${fmtS(k.rek.tglKeputusan)}</div></td><td title="${esc(divName(k.pemohon))}">${esc(k.pemohon)}</td><td>${svTag(s)}${s?`<div class="t2 mono">${esc(s.token)}</div>`:''}</td><td class="r num">${s?s.resp.length:'—'}</td><td class="r"><span class="score">${s&&s.resp.length?dec(svScore(s)):'—'}</span></td><td class="r">${s?`<button type="button" class="btn sm" data-act="svView" data-id="${s.id}">Lihat</button>`:adm?`<button type="button" class="btn sm pri" data-act="svGen" data-id="${k.id}">Buat link survei</button>`:'<span class="muted" style="font-size:12px">—</span>'}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Tidak ada kajian dengan status survei ini.</div>'}
    <p class="hint">Hanya kajian dengan keputusan <b>Diterima</b> atau <b>Diterima dengan catatan</b> yang bisa disurvei. Link dikirim ke divisi pemohon.</p>
  </section>
  <aside class="blk"><div class="bh"><h2>Penilaian per aspek</h2><span class="m">rata-rata, skala 1–5</span></div>${aspekBars(sv)}
    <div class="bh" style="margin-top:22px"><h2>Masukan terbaru</h2><span class="m">${sv.R.filter(x=>x.r.saran).length} masukan</span></div>
    ${sv.R.filter(x=>x.r.saran).sort((a,b)=>b.r.tgl.localeCompare(a.r.tgl)).slice(0,4).map(({r,s})=>{const k=byId(s.kajian);return `<blockquote class="quote"><p>${esc(r.saran)}</p><footer><span>${esc(r.jabatan||'Responden')}, ${esc(k.pemohon)}</span><span class="mono">${r.ov}/5</span></footer></blockquote>`}).join('')||'<div class="empty">Belum ada masukan tertulis.</div>'}
  </aside></div>`;
  return h;
}
function svMessage(s){const k=byId(s.kajian);
  return `Yth. Bapak/Ibu ${s.penerima||'Pimpinan'}\n${divName(k.pemohon)}\n\nTerima kasih atas permohonan kajian “${k.judul}”${k.nomor?' ('+k.nomor+')':''}. Hasil kajian tersebut telah diputuskan Direksi pada ${fmt(k.rek.tglKeputusan)}.\n\nUntuk perbaikan kajian berikutnya, kami mohon kesediaan Bapak/Ibu mengisi survei kepuasan singkat (sekitar 3 menit) melalui tautan berikut:\n${svUrl(s.token)}\n\nHormat kami,\nSekretariat Tim Kajian Internal\nPT Riset Perkebunan Nusantara`}
function openSv(id,fresh){
  const s=S.SV.find(x=>x.id===id);const k=byId(s.kajian);const adm=isAdmin(),dir=S.role==='direksi';
  const resp=s.resp.slice().sort((a,b)=>b.tgl.localeCompare(a.tgl));
  $('#modal').innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-labelledby="sv-t"><div class="mh"><div><h2 id="sv-t">${fresh?'Link survei siap dikirim':'Survei kepuasan'}</h2><div class="s">${esc(k.judul)}</div></div><button type="button" class="x" data-act="closeModal" aria-label="Tutup">×</button></div>
  <dl class="props"><dt>Kode survei</dt><dd class="mono" style="color:var(--ink)">${esc(s.token)}</dd><dt>Divisi pemohon</dt><dd>${esc(divName(k.pemohon))}</dd><dt>Dikirim kepada</dt><dd>${esc(s.penerima||'—')}</dd><dt>Dibuat</dt><dd>${fmt(s.dibuat)}</dd><dt>Status</dt><dd>${svTag(s)}</dd><dt>Skor keseluruhan</dt><dd>${s.resp.length?`<span class="score">${dec(svScore(s))}/5</span> dari ${s.resp.length} respons`:'Belum ada respons'}</dd></dl>
  ${dir?'':`<div class="bh" style="margin-top:18px"><h2>Link survei</h2><span class="m">alamat lengkap mengikuti web app saat di-deploy</span></div><div class="linkbox">${esc(svUrl(s.token))}</div>
  <div class="btnrow" style="margin-top:10px"><button type="button" class="btn sm" data-act="svCopy" data-id="${s.id}" data-w="link">Salin link</button><button type="button" class="btn sm" data-act="svCopy" data-id="${s.id}" data-w="msg">Salin pesan undangan</button><button type="button" class="btn sm" data-act="svPreview" data-id="${s.id}">Buka formulir responden</button>${adm?`<button type="button" class="btn sm ghost" data-act="svToggle" data-id="${s.id}">${s.status==='Ditutup'?'Buka kembali survei':'Tutup survei'}</button>`:''}</div>`}
  <div class="bh" style="margin-top:20px"><h2>Respons</h2><span class="m">${s.resp.length} respons</span></div>
  ${resp.length?resp.map(r=>`<div style="padding:10px 0;border-top:1px solid var(--line)"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><span><b style="font-weight:600">${esc(r.nama||'Tanpa nama')}</b> <span class="muted">· ${esc(r.jabatan||'—')}</span></span><span class="muted mono">${fmt(r.tgl)} · keseluruhan ${r.ov}/5</span></div>
    <div class="aspect">${ASPEK.map(([kk,l])=>`<div>${l}<b>${r.a[kk]||'—'}</b></div>`).join('')}</div>${r.saran?`<blockquote class="quote" style="border:0;padding:10px 0 0"><p>${esc(r.saran)}</p></blockquote>`:''}</div>`).join(''):'<div class="empty">Belum ada respons. Kirim link ke divisi pemohon, atau buka formulir responden untuk mencoba mengisi.</div>'}
  </div>`;
  $('#modal').hidden=false;
}

/* ================= Permintaan Data ================= */
function vData(){
  let L=S.DT.filter(d=>!d.deleted&&liveRef(d.kajian)&&inYear(d.tglMinta));
  const tabs=`<div class="tabs" role="group" aria-label="Saring status"><button type="button" data-act="dataF" data-v="" aria-pressed="${S.dataF===''}">Semua <em>${L.length}</em></button>${ST_DATA.map(s=>`<button type="button" data-act="dataF" data-v="${s}" aria-pressed="${S.dataF===s}">${s} <em>${L.filter(d=>d.status===s).length}</em></button>`).join('')}</div>`;
  if(S.dataF)L=L.filter(d=>d.status===S.dataF);
  L.sort((a,b)=>b.tglMinta.localeCompare(a.tglMinta));
  return tabs+(L.length?`<div class="wrap"><table class="tbl"><thead><tr><th>Data yang diminta</th><th>Kajian</th><th>Unit tujuan</th><th>Diminta</th><th>Diterima</th><th>Status</th><th>Data</th>${isAdmin()?'<th></th>':''}</tr></thead><tbody>${L.map(d=>`<tr><td><div class="t1">${esc(d.uraian)}</div>${d.catatan?`<div class="t2">${esc(d.catatan)}</div>`:''}</td><td>${kajianLink(d.kajian)}</td><td>${esc(d.unit)}</td><td class="num muted">${fmt(d.tglMinta)}</td><td class="num muted">${fmt(d.tglTerima)}</td><td>${isAdmin()?`<select class="in" data-chg="dataSt" data-id="${d.id}" aria-label="Status">${ST_DATA.map(s=>opt(s,s,d.status)).join('')}</select>`:decTag(d.status,ST_DATA_C[d.status])}</td><td>${flink('Buka',d.link)}</td>${isAdmin()?`<td><button type="button" class="btn sm ghost" data-act="editData" data-id="${d.id}">Ubah</button></td>`:''}</tr>`).join('')}</tbody></table></div>`:'<div class="empty">Tidak ada permintaan data dengan status ini.</div>');
}

/* ================= Rapat ================= */
function vRapat(){
  const L=S.R.filter(r=>!r.deleted&&liveRef(r.kajian)&&inYear(r.tgl));
  const isUp=r=>r.status==='Terjadwal'&&r.tgl>=TODAY;
  const up=L.filter(isUp).sort((a,b)=>a.tgl.localeCompare(b.tgl));
  const past=L.filter(r=>!isUp(r)).sort((a,b)=>b.tgl.localeCompare(a.tgl));
  const tl=L.flatMap(r=>r.tl.map(t=>({t,r}))).sort((a,b)=>(a.t.done-b.t.done)||b.r.tgl.localeCompare(a.r.tgl));
  const adm=isAdmin();
  const agRow=r=>{const d=D(r.tgl);return `<div class="ag"><div class="day"><b>${d.getDate()}</b><span>${BLN[d.getMonth()]}</span><span>${HARI[d.getDay()].slice(0,3)}</span></div><div><div class="t">${esc(r.agenda)}</div><div class="s">${esc(r.jam)} · ${esc(r.mode)} · ${esc(r.tempat)}</div><div class="s">${esc(r.peserta)}</div><div class="ft">${kajianLink(r.kajian)}${flink('Undangan',r.linkUndangan)}${r.status==='Selesai'?flink('Notulensi',r.linkNotulensi):''}${r.tl.length?`<span class="muted">tindak lanjut ${r.tl.filter(t=>t.done).length}/${r.tl.length} selesai</span>`:''}${r.status==='Dibatalkan'?decTag('Dibatalkan','var(--bad)'):''}</div></div>${adm?`<div class="btnrow">${r.status==='Selesai'?`<button type="button" class="btn sm ghost" data-act="newTl" data-id="${r.id}">Tindak lanjut</button>`:''}<button type="button" class="btn sm ghost" data-act="editRapat" data-id="${r.id}">Ubah</button></div>`:'<span></span>'}</div>`};
  return `<div class="cols c2" style="grid-template-columns:minmax(0,8fr) minmax(0,4fr)"><div style="min-width:0">
   <div class="bh" style="border-top:0;padding-top:0"><h2>Akan datang</h2><span class="m">${up.length} rapat</span></div><div class="agenda">${up.length?up.map(agRow).join(''):'<div class="empty">Belum ada rapat terjadwal.</div>'}</div>
   <div class="bh" style="border-top:0;margin-top:26px"><h2>Sudah dilaksanakan</h2><span class="m">${past.length} rapat</span></div><div class="agenda">${past.length?past.map(agRow).join(''):'<div class="empty">Belum ada rapat yang dilaksanakan.</div>'}</div>
  </div><aside class="blk"><div class="bh"><h2>Tindak lanjut rapat</h2><span class="m">${tl.filter(x=>!x.t.done).length} terbuka</span></div>${adm?'':'<p class="hint" style="margin:-4px 0 10px">Hanya admin yang dapat menandai selesai.</p>'}${tl.length?`<ul class="tl">${tl.map(({t,r})=>tlItem(t,r)).join('')}</ul>`:'<div class="empty">Belum ada tindak lanjut.</div>'}</aside></div>`;
}

/* ================= SOP ================= */
function vSop(){
  let L=S.SOP.filter(s=>!s.deleted);
  const tabs=`<div class="tabs" role="group" aria-label="Saring tahap"><button type="button" data-act="sopF" data-v="" aria-pressed="${S.sopF===''}">Semua <em>${L.length}</em></button>${SOP_TAHAP.map((t,i)=>`<button type="button" data-act="sopF" data-v="${i}" aria-pressed="${S.sopF===String(i)}">${t} <em>${L.filter(s=>s.tahap===i).length}</em></button>`).join('')}</div>`;
  if(S.sopF!=='')L=L.filter(s=>String(s.tahap)===S.sopF);
  const col=t=>t===4?'var(--accent)':t===0?'var(--muted)':'var(--warn)';
  return tabs+(L.length?`<div class="wrap"><table class="tbl"><thead><tr><th>Nomor</th><th>Dokumen</th><th>Divisi pemohon</th><th>Tahap</th><th>Revisi</th><th>Berlaku</th><th>Kajian</th><th>File</th>${isAdmin()?'<th></th>':''}</tr></thead><tbody>${L.map(s=>`<tr><td><span class="mono" style="color:var(--ink)">${esc(s.nomor)}</span></td><td><div class="t1">${esc(s.judul)}</div><div class="t2">${esc(s.jenis)}</div></td><td><span title="${esc(divName(s.pemohon))}">${esc(s.pemohon||'—')}</span></td><td><span class="st">${ring(s.tahap,5,col(s.tahap))}${SOP_TAHAP[s.tahap]||'—'}<span class="mono">${s.tahap+1}/5</span></span></td><td class="num">${s.revisi===''||s.revisi==null?'—':'Rev. '+s.revisi}</td><td class="num muted">${fmt(s.tglBerlaku)}</td><td>${kajianLink(s.kajian)}</td><td>${flink('Buka',s.link)}</td>${isAdmin()?`<td><div class="btnrow" style="flex-wrap:nowrap">${s.tahap<4?`<button type="button" class="btn sm" data-act="nextSop" data-id="${s.id}">Tahap berikutnya</button>`:''}<button type="button" class="btn sm ghost" data-act="editSop" data-id="${s.id}">Ubah</button></div></td>`:''}</tr>`).join('')}</tbody></table></div>`:'<div class="empty">Tidak ada SOP/IK pada tahap ini.</div>');
}

/* ================= Arsip ================= */
function vArsip(){const f=S.ars,js=S.role==='direksi'?DIR_DOK:S.M.jenisDok;
  return `<div class="tools"><input class="in grow" data-inp="arsq" type="search" placeholder="Cari nama dokumen atau nomor kajian" aria-label="Cari dokumen" value="${esc(f.q)}"><select class="in" data-chg="ars" data-k="jenis" aria-label="Jenis dokumen"><option value="">Semua jenis dokumen</option>${js.map(j=>opt(j,j,f.jenis)).join('')}</select></div><div id="ars-body"></div>`}
function renderArsTable(){
  const f=S.ars,dir=S.role==='direksi';
  let L=S.A.filter(a=>!a.deleted&&liveRef(a.kajian)&&inYear(a.tgl)&&(!dir||DIR_DOK.includes(a.jenis)));
  if(f.jenis)L=L.filter(a=>a.jenis===f.jenis);
  if(f.q){const q=f.q.toLowerCase();L=L.filter(a=>(a.nama+' '+kno(a.kajian)).toLowerCase().includes(q))}
  L.sort((a,b)=>b.tgl.localeCompare(a.tgl));
  const per=12,pages=Math.max(1,Math.ceil(L.length/per));if(f.page>pages)f.page=pages;
  const rows=L.slice((f.page-1)*per,f.page*per);const el=$('#ars-body');if(!el)return;
  el.innerHTML=L.length?`<div class="wrap"><table class="tbl"><thead><tr><th>Dokumen</th><th>Jenis</th><th>Kajian</th><th>Tanggal</th><th>Versi</th><th>File</th>${isAdmin()?'<th></th>':''}</tr></thead><tbody>${rows.map(a=>`<tr><td><div class="t1">${esc(a.nama)}</div></td><td><span class="tag">${esc(a.jenis)}</span></td><td>${kajianLink(a.kajian)}</td><td class="num muted">${fmt(a.tgl)}</td><td>${esc(a.versi||'—')}</td><td>${flink('Buka',a.link)}</td>${isAdmin()?`<td><button type="button" class="btn sm ghost" data-act="editArsip" data-id="${a.id}">Ubah</button></td>`:''}</tr>`).join('')}</tbody></table></div>${pager(L.length,f.page,per,'ars')}`:'<div class="empty">Tidak ada dokumen yang cocok.</div>';
}

/* ================= Ekspor ================= */
const DS=[
  ['erin','Evidence laporan','Kegiatan sekretariat pada periode terpilih, dengan output dan tautan evidence'],
  ['kajian','Register kajian','Seluruh kolom register, menurut tanggal penugasan'],
  ['rek','Hasil & rekomendasi','Rekomendasi ke Direksi, keputusan, dan tindak lanjut'],
  ['survei','Survei kepuasan','Satu baris per respons, dengan nilai tiap aspek dan masukan'],
  ['data','Permintaan data','Permintaan data ke unit kerja dan statusnya'],
  ['rapat','Rapat & tindak lanjut','Satu baris per butir tindak lanjut'],
  ['sop','SOP & instruksi kerja','Posisi SOP/IK yang dikaji (tidak disaring periode)'],
  ['arsip','Arsip dokumen','Daftar dokumen yang diarsipkan']
];
const inPeriod=(d,y,m)=>{if(!d)return false;if(y!=='Semua'&&d.slice(0,4)!==y)return false;if(m!=='0'&&+d.slice(5,7)!==+m)return false;return true};
function erinKeg(a){if(a==='Kajian didaftarkan')return 'Registrasi permohonan kajian baru';if(a.startsWith('Tahap diubah'))return 'Pemutakhiran tahapan kajian dalam register';if(a.startsWith('Keputusan Direksi'))return 'Pencatatan keputusan Direksi atas rekomendasi kajian';if(a.startsWith('Status permintaan')||a.startsWith('Permintaan data'))return 'Koordinasi kebutuhan data kajian';return a}
function getExport(ds,y,m){
  const per=y==='Semua'?'semua periode':(m==='0'?y:BLN_P[+m-1]+' '+y);
  const live=x=>!x.deleted&&liveRef(x.kajian);
  if(ds==='erin'){const r=[];
    S.LOG.filter(l=>liveRef(l.ref)&&inPeriod(l.t,y,m)&&!/^(Link survei|Respons survei)/.test(l.aksi)).forEach(l=>{const k=byId(l.ref);r.push([l.t,erinKeg(l.aksi),l.aksi+(k?' – '+k.judul:''),k?k.nomor:'','Riwayat perubahan Dashboard TKIN'])});
    S.R.filter(x=>live(x)&&x.status==='Selesai'&&inPeriod(x.tgl,y,m)).forEach(x=>r.push([x.tgl,'Penyiapan dan pelaksanaan rapat: '+x.agenda,'Notulensi rapat'+(x.tl.length?` dan ${x.tl.length} butir tindak lanjut`:''),kno(x.kajian),x.linkNotulensi||'—']));
    S.A.filter(x=>live(x)&&inPeriod(x.tgl,y,m)).forEach(x=>r.push([x.tgl,'Pengarsipan dokumen kajian',x.jenis+': '+x.nama,kno(x.kajian),x.link||'—']));
    S.SV.filter(s=>liveRef(s.kajian)).forEach(s=>{const k=byId(s.kajian);if(inPeriod(s.dibuat,y,m))r.push([s.dibuat,'Pengiriman survei kepuasan hasil kajian kepada divisi pemohon',`Link survei ${s.token} untuk ${divName(k.pemohon)}`,k.nomor,svUrl(s.token)]);
      s.resp.filter(p=>inPeriod(p.tgl,y,m)).forEach(p=>r.push([p.tgl,'Penerimaan respons survei kepuasan',`Skor keseluruhan ${p.ov}/5 dari ${divName(k.pemohon)}`,k.nomor,'Rekap survei Dashboard TKIN']))});
    r.sort((a,b)=>a[0].localeCompare(b[0]));
    return {name:'Evidence Laporan',file:`Evidence Laporan TKIN ${per}`,cols:['No','Tanggal','Kegiatan','Output','Kajian terkait','Evidence'],rows:r.map((x,i)=>[i+1,fmt(x[0]),x[1],x[2],x[3],x[4]])}}
  if(ds==='kajian'){const L=S.K.filter(k=>!k.deleted&&inPeriod(k.tglTugas,y,m)).sort((a,b)=>(a.nomor||'').localeCompare(b.nomor||''));
    return {name:'Register Kajian',file:`Register Kajian TKIN ${per}`,cols:['Nomor','Judul','Jenis','Divisi pemohon','Penugasan dari','Dasar penugasan','Tanggal penugasan','Target selesai','Ketua/PIC','Anggota','Tahap','Status khusus','Diperbarui','Folder'],rows:L.map(k=>[k.nomor,k.judul,k.jenis,divName(k.pemohon),k.sumber,k.dasar,fmt(k.tglTugas),k.target?fmt(k.target):'',k.pic,(k.anggota||[]).join('; '),(k.tahap+1)+'. '+TAHAP[k.tahap],k.statusKhusus,fmt(lastUpd(k)),k.linkFolder])}}
  if(ds==='rek'){const L=S.K.filter(k=>!k.deleted&&k.rek&&inPeriod(k.rek.tglSampai,y,m));
    return {name:'Hasil dan Rekomendasi',file:`Hasil dan Rekomendasi TKIN ${per}`,cols:['Nomor','Judul','Divisi pemohon','Tanggal disampaikan','Nomor surat','Ringkasan rekomendasi','Keputusan Direksi','Tanggal keputusan','Tindak lanjut','Status survei','Skor kepuasan'],rows:L.map(k=>{const s=svOf(k.id);return [k.nomor,k.judul,divName(k.pemohon),fmt(k.rek.tglSampai),k.rek.noSurat,k.rek.ringkasan,k.rek.keputusan,k.rek.tglKeputusan?fmt(k.rek.tglKeputusan):'',k.rek.tindakLanjut,eligible(k)?svStatus(s):'Tidak disurvei',s&&s.resp.length?dec(svScore(s)):'']})}}
  if(ds==='survei'){const rows=[];S.SV.filter(s=>liveRef(s.kajian)).forEach(s=>{const k=byId(s.kajian);s.resp.filter(p=>inPeriod(p.tgl,y,m)).forEach(p=>rows.push([s.token,k.nomor,k.judul,divName(k.pemohon),fmt(p.tgl),p.nama,p.jabatan].concat(ASPEK.map(([a])=>p.a[a]||'')).concat([p.ov,p.saran])))});
    return {name:'Survei Kepuasan',file:`Survei Kepuasan TKIN ${per}`,cols:['Kode survei','Nomor kajian','Judul kajian','Divisi pemohon','Tanggal respons','Nama','Jabatan'].concat(ASPEK.map(a=>a[1])).concat(['Keseluruhan','Masukan']),rows}}
  if(ds==='data'){const L=S.DT.filter(d=>live(d)&&inPeriod(d.tglMinta,y,m));
    return {name:'Permintaan Data',file:`Permintaan Data TKIN ${per}`,cols:['Kajian','Data yang diminta','Unit tujuan','Narahubung','Tanggal diminta','Status','Tanggal diterima','Link data','Catatan'],rows:L.map(d=>[kno(d.kajian),d.uraian,d.unit,d.narahubung,fmt(d.tglMinta),d.status,d.tglTerima?fmt(d.tglTerima):'',d.link,d.catatan])}}
  if(ds==='rapat'){const rows=[];S.R.filter(r=>live(r)&&inPeriod(r.tgl,y,m)).sort((a,b)=>a.tgl.localeCompare(b.tgl)).forEach(r=>{const base=[fmt(r.tgl),r.jam,r.agenda,kno(r.kajian),r.mode,r.tempat,r.status,r.linkNotulensi];if(!r.tl.length)rows.push(base.concat(['','','','']));r.tl.forEach(t=>rows.push(base.concat([t.u,t.p,t.tenggat?fmt(t.tenggat):'',t.done?'Selesai':'Terbuka'])))});
    return {name:'Rapat dan Tindak Lanjut',file:`Rapat dan Tindak Lanjut TKIN ${per}`,cols:['Tanggal','Jam','Agenda','Kajian','Bentuk','Tempat','Status rapat','Notulensi','Tindak lanjut','PIC','Tenggat','Status tindak lanjut'],rows}}
  if(ds==='sop'){const L=S.SOP.filter(s=>!s.deleted);
    return {name:'SOP dan IK',file:'SOP dan IK dikaji TKIN',cols:['Nomor','Jenis','Judul','Divisi pemohon','Tahap','Revisi','Tanggal berlaku','Kajian terkait','Link'],rows:L.map(s=>[s.nomor,s.jenis,s.judul,divName(s.pemohon),SOP_TAHAP[s.tahap],s.revisi,s.tglBerlaku?fmt(s.tglBerlaku):'',kno(s.kajian),s.link])}}
  const L=S.A.filter(a=>live(a)&&inPeriod(a.tgl,y,m)).sort((a,b)=>a.tgl.localeCompare(b.tgl));
  return {name:'Arsip Dokumen',file:`Arsip Dokumen TKIN ${per}`,cols:['Nama dokumen','Jenis','Kajian','Tanggal','Versi','Link'],rows:L.map(a=>[a.nama,a.jenis,kno(a.kajian),fmt(a.tgl),a.versi,a.link])};
}
function vEkspor(){const e=S.ex;const years=[...new Set(S.K.map(k=>k.tglTugas.slice(0,4)).concat([NOWY]))].sort().reverse();
  return `<div class="exgrid"><section><div class="dslist" role="radiogroup" aria-label="Data yang diekspor">${DS.map(([v,l,s])=>`<label><input type="radio" name="ds" value="${v}" data-chg="ex" data-k="ds" ${e.ds===v?'checked':''}><span><b>${l}</b><small>${s}</small></span></label>`).join('')}</div>
  <div class="frow"><label for="ex-y">Tahun<select class="in" id="ex-y" data-chg="ex" data-k="y">${opt('Semua','Semua tahun',e.y)}${years.map(y=>opt(y,y,e.y)).join('')}</select></label><label for="ex-m">Bulan<select class="in" id="ex-m" data-chg="ex" data-k="m">${opt('0','Semua bulan',e.m)}${BLN_P.map((b,i)=>opt(String(i+1),b,e.m)).join('')}</select></label></div>
  <div class="btnrow"><button type="button" class="btn pri" data-act="dl" data-kind="xlsx">Unduh Excel</button><button type="button" class="btn" data-act="dl" data-kind="csv">Unduh CSV</button><button type="button" class="btn ghost" data-act="copy">Salin tabel</button></div>
  <p class="hint">“Salin tabel” menyalin data yang bisa langsung ditempel ke Excel atau Google Sheets. Pakai bila unduhan diblokir browser.</p></section>
  <section class="blk" style="min-width:0"><div class="bh"><h2 id="ex-title">Pratinjau</h2><span class="m" id="ex-count"></span></div><div id="ex-prev"></div></section></div>`}
function renderExPrev(){const e=S.ex;const x=getExport(e.ds,e.y,e.m);const el=$('#ex-prev');if(!el)return;
  $('#ex-title').textContent=x.file;$('#ex-count').textContent=x.rows.length+' baris';
  el.innerHTML=x.rows.length?`<div class="wrap"><table class="tbl"><thead><tr>${x.cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${x.rows.slice(0,12).map(r=>`<tr>${r.map(v=>`<td style="font-size:12.5px">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${x.rows.length>12?`<p class="hint">Menampilkan 12 dari ${x.rows.length} baris. File unduhan berisi semua baris.</p>`:''}`:'<div class="empty">Tidak ada data pada periode ini. Ubah tahun atau bulan.</div>'}
let dlP=null;
function getDL(){try{if(!dlP&&window.claude&&typeof window.claude.use==='function')dlP=window.claude.use('downloads').catch(()=>null)}catch(_){}return dlP||Promise.resolve(null)}
async function download(kind){
  const e=S.ex;const x=getExport(e.ds,e.y,e.m);
  if(!x.rows.length){toast('Tidak ada data untuk diunduh pada periode ini.');return}
  const filename=x.file+'.'+kind;let blob;
  try{
    if(kind==='xlsx'){
      const data=[x.cols.map(c=>({value:String(c),fontWeight:'bold'}))].concat(x.rows.map(r=>r.map(v=>({value:v==null||v===''?null:(typeof v==='number'?v:String(v))}))));
      const columns=x.cols.map((c,i)=>({width:Math.min(60,Math.max(String(c).length,...x.rows.map(r=>String(r[i]==null?'':r[i]).length))+2)}));
      blob=await writeXlsxFile(data,{sheet:x.name.slice(0,31),columns,stickyRowsCount:1}).toBlob();
    }else{
      const q=v=>{const t=String(v==null?'':v);return /[";\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t};
      blob=new Blob(['\ufeff'+[x.cols].concat(x.rows).map(r=>r.map(q).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    }
  }catch(err){console.error(err);toast('Gagal membuat file. Pakai “Salin tabel”.');return}
  const dl=await Promise.race([getDL(),new Promise(r=>setTimeout(()=>r(null),2500))]);
  if(dl){try{const res=await dl.save({filename,data:blob});if(res&&res.status==='saved')toast('File disimpan: '+filename)}catch(err){const c=err&&err.code;toast(c==='declined'?'Unduhan dibatalkan.':c==='rate_limited'?'Masih ada konfirmasi unduhan yang terbuka.':'Unduhan tidak tersedia di sini. Pakai “Salin tabel”.')}return}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast('File diunduh: '+filename)}catch(_){toast('Unduhan diblokir. Pakai “Salin tabel”.')}
}
function copyText(t,okMsg){try{navigator.clipboard.writeText(t).then(()=>toast(okMsg),()=>toast('Browser menolak akses clipboard.'))}catch(_){toast('Browser menolak akses clipboard.')}}
function copyTable(){const e=S.ex;const x=getExport(e.ds,e.y,e.m);copyText([x.cols].concat(x.rows).map(r=>r.map(v=>String(v==null?'':v).replace(/[\t\n]/g,' ')).join('\t')).join('\n'),`${x.rows.length} baris disalin. Tempel di Excel atau Google Sheets.`)}

/* ================= Detail kajian ================= */
function openDetail(id){S.open=id;renderDetail();$('#drawer').hidden=false;const x=$('#drawer .x');x&&x.focus()}
function closeDrawer(){$('#drawer').hidden=true;S.open=null}
function renderDetail(){
  const k=byId(S.open);if(!k||k.deleted){closeDrawer();return}
  const dir=S.role==='direksi',adm=isAdmin();
  const data=S.DT.filter(d=>d.kajian===k.id&&!d.deleted);
  const rap=S.R.filter(r=>r.kajian===k.id&&!r.deleted).sort((a,b)=>b.tgl.localeCompare(a.tgl));
  const dok=S.A.filter(a=>a.kajian===k.id&&!a.deleted&&(!dir||DIR_DOK.includes(a.jenis))).sort((a,b)=>b.tgl.localeCompare(a.tgl));
  const lg=S.LOG.filter(l=>l.ref===k.id).slice().sort((a,b)=>(b.t+b.w).localeCompare(a.t+a.w));
  const sop=S.SOP.filter(s=>s.kajian===k.id&&!s.deleted);
  const s=svOf(k.id);
  const tg=i=>{const r=k.riwayat.filter(x=>x.tahap===i).pop();return r?fmt(r.tgl):''};
  const sec=(title,right,body)=>`<section class="dsec"><div class="bh"><h2>${title}</h2><span class="m">${right||''}</span></div>${body}</section>`;
  let h=`<header class="dh"><span class="mono" style="color:var(--ink)">${esc(noK(k))}</span><button type="button" class="x" data-act="closeDrawer" aria-label="Tutup detail">×</button></header><div class="db"><div><h2>${esc(k.judul)}</h2><div style="margin-top:8px">${stTahap(k)}${k.statusKhusus?` <span class="tag" style="margin-left:6px">${esc(k.statusKhusus)}</span>`:''}</div></div>`;
  if(adm)h+=`<div class="btnrow">${k.tahap<7?`<button type="button" class="btn sm pri" data-act="nextTahap" data-id="${k.id}">Pindah ke “${TAHAP[k.tahap+1]}”</button>`:''}${k.tahap>=6?`<button type="button" class="btn sm" data-act="rekForm" data-id="${k.id}">Catat hasil & keputusan</button>`:''}<button type="button" class="btn sm" data-act="setTahap" data-id="${k.id}">Atur tahap &amp; tanggal</button><button type="button" class="btn sm" data-act="editKajian" data-id="${k.id}">Ubah data</button><button type="button" class="btn sm ghost danger" data-act="delKajian" data-id="${k.id}">Hapus</button></div>`;
  h+=`<dl class="props"><dt>Divisi pemohon</dt><dd>${esc(divName(k.pemohon))}</dd><dt>Jenis kajian</dt><dd>${esc(k.jenis)}</dd><dt>Penugasan dari</dt><dd>${esc(k.sumber||'—')}</dd><dt>Dasar penugasan</dt><dd>${esc(k.dasar||'—')}</dd><dt>Tanggal penugasan</dt><dd>${fmt(k.tglTugas)}</dd><dt>Target selesai</dt><dd>${k.target?fmt(k.target):'<span class="muted">Tidak ditetapkan</span>'}</dd><dt>Ketua / PIC</dt><dd>${who(k.pic)}</dd><dt>Anggota</dt><dd>${esc((k.anggota||[]).join(', ')||'—')}</dd><dt>Folder</dt><dd>${flink('Buka folder Google Drive',k.linkFolder)}</dd></dl>`;
  h+=sec('Latar belakang dan ruang lingkup','',`<p>${esc(k.ringkasan||'—')}</p>`);
  h+=sec('Tahapan',`${k.tahap+1} dari 8`,`<ol class="vstep">${TAHAP.map((t,i)=>{const st=i<k.tahap?'done':i===k.tahap?'cur':'todo';return `<li class="${st}"><span class="d">${st==='done'?'✓':i+1}</span><span class="n">${t}</span><span class="g">${i<=k.tahap?tg(i):''}</span></li>`}).join('')}</ol>`);
  if(k.rek){const r=k.rek;h+=sec('Hasil dan rekomendasi',kepTag(r.keputusan),`<p>${esc(r.ringkasan||'Ringkasan rekomendasi belum diisi.')}</p><dl class="props" style="margin-top:12px"><dt>Disampaikan</dt><dd>${fmt(r.tglSampai)}${r.noSurat?' · '+esc(r.noSurat):''}</dd><dt>Tanggal keputusan</dt><dd>${fmt(r.tglKeputusan)}</dd><dt>Tindak lanjut</dt><dd>${esc(r.tindakLanjut||'—')}</dd></dl>`)}
  if(eligible(k)){h+=sec('Survei kepuasan pemohon',svTag(s),s?`<dl class="props"><dt>Kode</dt><dd class="mono" style="color:var(--ink)">${esc(s.token)}</dd><dt>Dikirim kepada</dt><dd>${esc(s.penerima||'—')}</dd><dt>Respons</dt><dd>${s.resp.length?`${s.resp.length} · skor ${dec(svScore(s))}/5`:'Belum ada'}</dd></dl><div class="btnrow" style="margin-top:10px"><button type="button" class="btn sm" data-act="svView" data-id="${s.id}">Lihat survei</button></div>`:`<p class="muted">Kajian ini sudah diterima Direksi dan bisa dimintakan penilaian ke ${esc(divName(k.pemohon))}.</p>${adm?`<div class="btnrow" style="margin-top:10px"><button type="button" class="btn sm pri" data-act="svGen" data-id="${k.id}">Buat link survei</button></div>`:''}`)}
  if(!dir){
    h+=sec('Permintaan data',adm?`<button type="button" class="lnk" data-act="newData" data-k="${k.id}">Tambah</button>`:'',data.length?`<ul class="rows">${data.map(d=>`<li><div class="g"><div class="t">${esc(d.uraian)}</div><div class="s">${esc(d.unit)} · diminta ${fmt(d.tglMinta)}${d.tglTerima?' · diterima '+fmt(d.tglTerima):''}</div></div>${decTag(d.status,ST_DATA_C[d.status])}</li>`).join('')}</ul>`:'<div class="empty">Belum ada permintaan data.</div>');
    h+=sec('Rapat',adm?`<button type="button" class="lnk" data-act="newRapat" data-k="${k.id}">Jadwalkan</button>`:'',rap.length?`<ul class="rows">${rap.map(r=>`<li><div class="g"><div class="t">${esc(r.agenda)}</div><div class="s">${fmt(r.tgl)} · ${esc(r.jam)} · ${esc(r.mode)} · ${esc(r.status)}${r.tl.length?` · tindak lanjut ${r.tl.filter(t=>t.done).length}/${r.tl.length}`:''}</div></div>${flink(r.linkNotulensi?'Notulensi':'Undangan',r.linkNotulensi||r.linkUndangan)}</li>`).join('')}</ul>`:'<div class="empty">Belum ada rapat.</div>');
    if(sop.length)h+=sec('SOP / IK terkait','',`<ul class="rows">${sop.map(x=>`<li><div class="g"><div class="t">${esc(x.judul)}</div><div class="s"><span class="mono">${esc(x.nomor)}</span> · ${SOP_TAHAP[x.tahap]} · Rev. ${esc(x.revisi)}</div></div></li>`).join('')}</ul>`);
  }
  h+=sec(dir?'Dokumen hasil kajian':'Dokumen',adm?`<button type="button" class="lnk" data-act="newArsip" data-k="${k.id}">Tambah</button>`:'',dok.length?`<ul class="rows">${dok.map(a=>`<li><div class="g"><div class="t">${esc(a.nama)}</div><div class="s">${esc(a.jenis)} · ${fmt(a.tgl)} · versi ${esc(a.versi||'—')}</div></div>${flink('Buka',a.link)}</li>`).join('')}</ul>`:'<div class="empty">Belum ada dokumen.</div>');
  if(!dir)h+=sec('Riwayat perubahan',lg.length+' catatan',`<table class="log"><tbody>${lg.map(l=>`<tr><td class="mono">${fmtS(l.t)}${l.w?' '+l.w:''}</td><td>${esc(l.aksi)}</td><td class="muted" style="text-align:right">${esc(l.role)}</td></tr>`).join('')}</tbody></table>`);
  $('#drawer .panel').innerHTML=h+'</div>';
}

/* ================= Halaman responden ================= */
function renderResp(){
  const sv=S.SV.find(s=>s.token.toLowerCase()===S.resp);const el=$('#resp');
  const bar=`<div class="rbar"><span><b>Pratinjau tampilan responden.</b> Halaman ini yang dibuka divisi pemohon dari link survei.</span><button type="button" class="btn sm" data-act="backSurvei">Kembali ke dashboard</button></div>`;
  const top=`<div class="rtop"><div class="mark" aria-hidden="true">TKIN</div><span>Tim Kajian Internal · PT Riset Perkebunan Nusantara</span></div>`;
  if(!sv){el.innerHTML=bar+`<div class="rwrap">${top}<h1>Survei tidak ditemukan</h1><p class="intro">Periksa kembali link yang Anda terima, atau hubungi Sekretariat TKIN.</p></div>`;return}
  const k=byId(sv.kajian);
  if(S.respDone){el.innerHTML=bar+`<div class="rwrap">${top}<div class="done-box"><h1>Terima kasih.</h1><p class="intro">Penilaian Anda untuk kajian “${esc(k.judul)}” sudah kami terima dan akan dipakai untuk memperbaiki kajian berikutnya.</p><button type="button" class="btn" data-act="backSurveiView" data-id="${sv.id}">Lihat hasilnya di dashboard</button></div></div>`;return}
  if(sv.status==='Ditutup'){el.innerHTML=bar+`<div class="rwrap">${top}<h1>Survei sudah ditutup</h1><p class="intro">Survei untuk kajian “${esc(k.judul)}” tidak lagi menerima respons. Terima kasih atas perhatian Anda.</p></div>`;return}
  const qs=ASPEK.map(([key,l,help],i)=>`<fieldset class="q" id="q-${key}"><legend><span class="qn">${pad(i+1)}</span>${l}</legend><p class="help">${help}</p><div class="scale">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="${key}" value="${n}"><span>${n}</span></label>`).join('')}</div><div class="sl"><span>Sangat tidak puas</span><span>Sangat puas</span></div><div class="em">Pilih salah satu nilai.</div></fieldset>`).join('');
  el.innerHTML=bar+`<div class="rwrap">${top}<h1>Survei kepuasan hasil kajian</h1><p class="intro">Divisi Anda mengajukan kajian ini kepada TKIN. Mohon beri penilaian atas hasilnya. Survei ini memerlukan sekitar 3 menit.</p>
  <div class="rk"><dl class="props"><dt>Kajian</dt><dd>${esc(k.judul)}</dd><dt>Nomor</dt><dd class="mono" style="color:var(--ink)">${esc(noK(k))}</dd><dt>Divisi pemohon</dt><dd>${esc(divName(k.pemohon))}</dd><dt>Keputusan Direksi</dt><dd>${esc(k.rek.keputusan)}, ${fmt(k.rek.tglKeputusan)}</dd></dl></div>
  <form id="rform" novalidate>${qs}
  <fieldset class="q" id="q-ov"><legend><span class="qn">${pad(ASPEK.length+1)}</span>Secara keseluruhan, seberapa puas Anda dengan hasil kajian ini?</legend><div class="scale">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="ov" value="${n}"><span>${n}</span></label>`).join('')}</div><div class="sl"><span>Sangat tidak puas</span><span>Sangat puas</span></div><div class="em">Pilih salah satu nilai.</div></fieldset>
  <fieldset class="q"><legend><span class="qn">${pad(ASPEK.length+2)}</span>Saran atau masukan untuk TKIN</legend><div class="rf"><label class="f full" for="r-saran">Opsional<textarea class="in" id="r-saran" rows="4"></textarea></label><label class="f" for="r-nama">Nama (opsional)<input class="in" id="r-nama" type="text"></label><label class="f" for="r-jab">Jabatan (opsional)<input class="in" id="r-jab" type="text"></label></div></fieldset>
  <div style="margin-left:32px"><button type="submit" class="btn pri" style="height:40px;padding:0 20px">Kirim penilaian</button></div></form></div>`;
  $('#rform').addEventListener('submit',ev=>{ev.preventDefault();
    const val={};let first=null;
    ASPEK.map(a=>a[0]).concat(['ov']).forEach(key=>{const c=document.querySelector(`#rform input[name="${key}"]:checked`);const fs=$('#q-'+key);fs.classList.toggle('err',!c);if(!c&&!first)first=fs;val[key]=c?+c.value:null});
    if(first){first.scrollIntoView({behavior:'smooth',block:'center'});toast('Masih ada pertanyaan yang belum dinilai.');return}
    sv.resp.push({id:uid('p'),tgl:TODAY,nama:$('#r-nama').value.trim(),jabatan:$('#r-jab').value.trim(),a:{a1:val.a1,a2:val.a2,a3:val.a3,a4:val.a4,a5:val.a5},ov:val.ov,saran:$('#r-saran').value.trim()});
    log(`Respons survei kepuasan diterima (${sv.token})`,k.id);S.respDone=true;renderResp();window.scrollTo(0,0)});
  document.querySelectorAll('#rform input[type=radio]').forEach(i=>i.addEventListener('change',()=>i.closest('.q').classList.remove('err')));
}

/* ================= Form ================= */
const F={
  kajian:[['nomor','Nomor kajian','text',{h:'Nomor surat kajian. Boleh dikosongkan dan diisi setelah suratnya terbit.'}],['judul','Judul kajian','text',{full:1}],['pemohon','Divisi pemohon','master',{list:'divisi',h:'Divisi yang mengajukan kajian; tujuan survei kepuasan'}],['jenis','Jenis kajian','master',{list:'jenis'}],['sumber','Penugasan dari','text'],['dasar','Dasar penugasan','text',{h:'Nomor memo atau disposisi'}],['tglTugas','Tanggal penugasan','date'],['target','Target selesai','date',{h:'Opsional, hanya sebagai informasi'}],['pic','Ketua / PIC','master',{list:'orang'}],['statusKhusus','Status khusus','select',{o:['','Ditunda','Dibatalkan'],ol:['Tidak ada','Ditunda','Dibatalkan']}],['anggota','Anggota tim','checks',{list:'orang',full:1}],['ringkasan','Latar belakang dan ruang lingkup','textarea',{full:1}],['linkFolder','Link folder Google Drive','url',{full:1}]],
  rek:[['tglSampai','Tanggal disampaikan ke Direksi','date'],['noSurat','Nomor surat penyampaian','text'],['ringkasan','Ringkasan rekomendasi','textarea',{full:1}],['keputusan','Keputusan Direksi','select',{o:KEP}],['tglKeputusan','Tanggal keputusan','date'],['tindakLanjut','Tindak lanjut','text',{full:1,h:'Misalnya nomor SK atau kebijakan yang terbit'}]],
  data:[['kajian','Kajian','kajian',{full:1}],['uraian','Data yang diminta','text',{full:1}],['unit','Unit tujuan','text'],['narahubung','Narahubung di unit','text'],['tglMinta','Tanggal diminta','date'],['status','Status','select',{o:ST_DATA}],['tglTerima','Tanggal diterima','date'],['link','Link data (Google Drive)','url'],['catatan','Catatan','textarea',{full:1}]],
  rapat:[['kajian','Kajian','kajian',{full:1}],['agenda','Agenda rapat','text',{full:1}],['tgl','Tanggal','date'],['jam','Jam','text',{h:'Misalnya 09.00–11.00'}],['mode','Bentuk','select',{o:['Offline','Online','Hybrid']}],['tempat','Tempat atau tautan rapat','text'],['peserta','Peserta','text',{full:1}],['status','Status','select',{o:['Terjadwal','Selesai','Dibatalkan']}],['linkUndangan','Link undangan','url'],['linkNotulensi','Link notulensi','url']],
  tl:[['u','Uraian tindak lanjut','text',{full:1}],['p','PIC','text'],['tenggat','Tenggat','date',{h:'Opsional'}]],
  sop:[['nomor','Nomor dokumen','text'],['jenis','Jenis','select',{o:['SOP','IK']}],['judul','Judul','text',{full:1}],['pemohon','Divisi pemohon','master',{list:'divisi'}],['tahap','Tahap','select',{o:SOP_TAHAP.map((_,i)=>String(i)),ol:SOP_TAHAP}],['revisi','Revisi ke-','number'],['tglBerlaku','Tanggal berlaku','date'],['kajian','Kajian terkait','kajian',{full:1}],['link','Link dokumen','url',{full:1}]],
  arsip:[['nama','Nama dokumen','text',{full:1}],['jenis','Jenis dokumen','master',{list:'jenisDok'}],['kajian','Kajian','kajian'],['tgl','Tanggal','date'],['versi','Versi','text'],['link','File','url',{full:1,h:'Di versi jadi, file diunggah langsung ke Google Drive'}]],
  svgen:[['penerima','Dikirim kepada','text',{full:1,h:'Nama atau jabatan penerima di divisi pemohon, misalnya Kepala Bagian Pemuliaan'}]]
};
const MLAB={divisi:'divisi',jenis:'jenis kajian',jenisDok:'jenis dokumen',orang:'nama'};
function mOpts(list,v){return `<option value="">Pilih ${MLAB[list]}</option>`+S.M[list].map(x=>list==='divisi'?opt(x[0],x[0]+' · '+x[1],v):opt(x,x,v)).join('')}
function mChecks(list,vals){const L=S.M[list].slice();vals.forEach(x=>{if(!L.includes(x))L.push(x)});return L.map(x=>`<label class="ck"><input type="checkbox" value="${esc(x)}" ${vals.includes(x)?'checked':''}><span>${esc(x)}</span></label>`).join('')}
function mAddBox(k,list){return `<div class="madd" id="madd-${k}" hidden>${list==='divisi'?`<input class="in" id="madd-${k}-a" placeholder="Singkatan, mis. PPKS" aria-label="Singkatan divisi"><input class="in" id="madd-${k}-b" placeholder="Nama lengkap divisi" aria-label="Nama lengkap divisi">`:`<input class="in" id="madd-${k}-a" placeholder="${list==='orang'?'Nama lengkap dengan gelar':'Nama '+MLAB[list]+' baru'}" aria-label="${list==='orang'?'Nama baru':'Nama '+MLAB[list]+' baru'}">`}<button type="button" class="btn sm pri" data-act="mSave" data-k="${k}" data-list="${list}">Tambahkan</button><button type="button" class="btn sm ghost" data-act="mCancel" data-k="${k}">Batal</button></div>`}
function openForm(kind,obj,title,onSave,sub){
  const fs=F[kind];
  const body=fs.map(([k,l,t,o])=>{o=o||{};const id='f-'+k;const v=obj[k]==null?'':obj[k];let c;
    if(t==='master'){c=`<div class="mrow"><select class="in" id="${id}" data-list="${o.list}">${mOpts(o.list,v)}</select><button type="button" class="btn sm" data-act="mAdd" data-k="${k}" aria-label="Tambah ${MLAB[o.list]} baru">+ Tambah</button></div>${mAddBox(k,o.list)}`;
      return `<div class="f${o.full?' full':''}"><label for="${id}">${esc(l)}</label>${c}${o.h?`<small>${esc(o.h)}</small>`:''}</div>`}
    if(t==='checks'){const vals=Array.isArray(v)?v:String(v||'').split(/;\s*/).filter(Boolean);
      c=`<div class="checks" id="${id}" data-list="${o.list}" role="group" aria-labelledby="${id}-l"><input class="in" type="search" placeholder="Cari nama" data-inp="ckq" aria-label="Cari nama"><div class="cklist">${mChecks(o.list,vals)}</div><div class="ckfoot"><span class="muted" data-ckcount>${vals.length} dipilih</span><button type="button" class="btn sm" data-act="mAdd" data-k="${k}">+ Tambah nama</button></div>${mAddBox(k,o.list)}</div>`;
      return `<div class="f${o.full?' full':''}"><span id="${id}-l">${esc(l)}</span>${c}<small>Centang satu atau lebih. Nama yang belum ada bisa ditambahkan.</small></div>`}
    if(t==='select')c=`<select class="in" id="${id}">${o.o.map((x,i)=>opt(x,(o.ol||o.o)[i],v)).join('')}</select>`;
    else if(t==='kajian')c=`<select class="in" id="${id}"><option value="">Tidak terkait kajian</option>${S.K.filter(x=>!x.deleted).sort((a,b)=>b.tglTugas.localeCompare(a.tglTugas)).map(x=>opt(x.id,noK(x)+' · '+x.judul,v)).join('')}</select>`;
    else if(t==='textarea')c=`<textarea class="in" id="${id}" rows="3">${esc(v)}</textarea>`;
    else c=`<input class="in" id="${id}" type="${t}" value="${esc(v)}"${t==='url'?' placeholder="https://drive.google.com/…"':''}>`;
    return `<label class="f${o.full?' full':''}" for="${id}">${esc(l)}${c}${o.h?`<small>${esc(o.h)}</small>`:''}</label>`}).join('');
  $('#modal').innerHTML=`<div class="box${fs.length<3?' sm':''}" role="dialog" aria-modal="true" aria-labelledby="m-t"><div class="mh"><div><h2 id="m-t">${esc(title)}</h2>${sub?`<div class="s">${sub}</div>`:''}</div><button type="button" class="x" data-act="closeModal" aria-label="Tutup">×</button></div><form id="mform" novalidate><div class="fgrid">${body}</div>${kind==='svgen'?'':'<p class="note">Semua isian boleh dikosongkan dan dilengkapi kemudian.</p>'}<div class="mf"><button type="button" class="btn ghost" data-act="closeModal">Batal</button><button type="submit" class="btn pri">${kind==='svgen'?'Buat link':'Simpan'}</button></div></form></div>`;
  $('#modal').hidden=false;
  $('#mform').addEventListener('submit',ev=>{ev.preventDefault();const val={};fs.forEach(([k,,t])=>{if(t==='checks'){val[k]=[...document.querySelectorAll('#f-'+k+' .cklist input:checked')].map(i=>i.value);return}let v=$('#f-'+k).value.trim();if(t==='number'||(kind==='sop'&&k==='tahap'))v=v===''?'':Number(v);val[k]=v});closeModal();onSave(val)});
  setTimeout(()=>{const f=$('#modal .in');f&&f.focus()},30);
}
function dateErr(t,min){if(!t)return 'Isi tanggalnya.';if(t>TODAY)return 'Tanggal tidak boleh melewati hari ini.';if(min&&t<min)return `Tanggal tidak boleh sebelum tahap sebelumnya (${fmt(min)}).`;return ''}
function ask(title,msg,ok,fn,danger){
  $('#modal').innerHTML=`<div class="box sm" role="alertdialog" aria-modal="true" aria-labelledby="a-t"><h2 id="a-t">${esc(title)}</h2><p>${msg}</p><div class="mf"><button type="button" class="btn ghost" data-act="closeModal">Batal</button><button type="button" class="btn ${danger?'dangerf':'pri'}" id="ask-ok">${esc(ok)}</button></div></div>`;
  $('#modal').hidden=false;$('#ask-ok').addEventListener('click',()=>{closeModal();fn()});$('#ask-ok').focus();
}
function closeModal(){$('#modal').hidden=true;$('#modal').innerHTML=''}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),3000)}
function refresh(){render();if(S.open&&!$('#drawer').hidden)renderDetail()}
const emptyRek=()=>({tglSampai:TODAY,noSurat:'',ringkasan:'',keputusan:'Belum diputuskan',tglKeputusan:'',tindakLanjut:''});
function newToken(){const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let t;do{t='SV-';for(let i=0;i<5;i++)t+=A[Math.floor(Math.random()*A.length)]}while(S.SV.some(s=>s.token===t));return t}

/* ================= Aksi ================= */
const ACT={
  role:d=>{S.role=d.role;const h=location.hash.slice(1);if(VIEWS[h])S.view=h;closeDrawer();closeModal();render();toast('Sekarang melihat sebagai '+ROLES[d.role])},
  goTahap:d=>{S.reg={q:'',jenis:'',tahap:d.i,pemohon:'',status:'',page:1};go('register')},
  resetReg:()=>{S.reg={q:'',jenis:'',tahap:'',pemohon:'',status:'',page:1};render()},
  open:d=>{closeModal();openDetail(d.id)},
  closeDrawer:()=>closeDrawer(),
  closeModal:()=>closeModal(),
  fake:()=>toast('Di versi jadi, tautan ini membuka file di Google Drive.'),
  page:d=>{const p=+d.p;if(d.s==='reg'){S.reg.page=p;renderRegTable()}else{S.ars.page=p;renderArsTable()}},
  rekF:d=>{S.rekF=d.v;render()},dataF:d=>{S.dataF=d.v;render()},sopF:d=>{S.sopF=d.v;render()},svF:d=>{S.svF=d.v;render()},
  newKajian:()=>openForm('kajian',{tglTugas:TODAY,jenis:S.M.jenis[0],linkFolder:'',anggota:[]},'Daftarkan kajian baru',v=>{
    const k=Object.assign({id:uid('k'),tahap:0,riwayat:[{tahap:0,tgl:v.tglTugas||TODAY}],rek:null,deleted:false},v);
    if(!k.tglTugas)k.tglTugas=TODAY;if(!k.judul)k.judul='(Judul belum diisi)';
    S.K.push(k);log('Kajian didaftarkan',k.id);if(!inYear(k.tglTugas))S.year='Semua';
    render();openDetail(k.id);toast(k.nomor?'Kajian '+k.nomor+' terdaftar':'Kajian terdaftar. Nomor bisa diisi setelah suratnya terbit.')}),
  editKajian:d=>{const k=byId(d.id);openForm('kajian',k,'Ubah data kajian',v=>{Object.assign(k,v);if(!k.tglTugas)k.tglTugas=k.riwayat[0].tgl;k.riwayat[0].tgl=k.tglTugas;log('Data kajian diubah',k.id);refresh();toast('Perubahan tersimpan')})},
  nextTahap:d=>{const k=byId(d.id);if(k.tahap>=7)return;const nt=k.tahap+1;const prev=lastUpd(k);
    $('#modal').innerHTML=`<div class="box sm" role="dialog" aria-modal="true" aria-labelledby="nt-t"><h2 id="nt-t">Pindahkan tahap</h2><p><b>${esc(k.judul)}</b> dipindahkan dari “${TAHAP[k.tahap]}” ke “${TAHAP[nt]}”.</p>
      <form id="ntform" novalidate style="margin-top:14px"><label class="f" for="nt-d">Tanggal masuk tahap “${TAHAP[nt]}”<input class="in" id="nt-d" type="date" value="${TODAY}" min="${prev}" max="${TODAY}"><small>Isi tanggal sebenarnya bila data diinput belakangan. Tahap sebelumnya: ${fmt(prev)}.</small></label><p class="gerr" id="nt-err" hidden></p>
      <div class="mf"><button type="button" class="btn ghost" data-act="closeModal">Batal</button><button type="submit" class="btn pri">Pindahkan</button></div></form></div>`;
    $('#modal').hidden=false;
    $('#ntform').addEventListener('submit',ev=>{ev.preventDefault();const t=$('#nt-d').value;const err=dateErr(t,prev);if(err){const e=$('#nt-err');e.textContent=err;e.hidden=false;return}
      closeModal();k.tahap=nt;k.riwayat.push({tahap:nt,tgl:t});if(nt>=6&&!k.rek)k.rek=emptyRek();if(nt===6)k.rek.tglSampai=t;if(nt===7&&!k.rek.tglKeputusan)k.rek.tglKeputusan=t;
      log(`Tahap diubah ke “${TAHAP[nt]}”`,k.id,t,true);refresh();toast('Tahap diperbarui');if(nt>=6)setTimeout(()=>ACT.rekForm({id:k.id}),250)});
    setTimeout(()=>{const i=$('#nt-d');i&&i.focus()},30)},
  setTahap:d=>{const k=byId(d.id);const dt=i=>{const r=k.riwayat.filter(x=>x.tahap===i).pop();return r?r.tgl:''};
    const rows=TAHAP.map((t,i)=>`<div class="strow" data-i="${i}" ${i>k.tahap?'hidden':''}><label for="st-${i}">${i+1}. ${t}</label><input class="in" id="st-${i}" type="date" max="${TODAY}" value="${i===0?k.tglTugas:dt(i)}"></div>`).join('');
    $('#modal').innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-labelledby="st-t"><div class="mh"><div><h2 id="st-t">Atur tahap dan tanggal</h2><div class="s">${esc(k.judul)}</div></div><button type="button" class="x" data-act="closeModal" aria-label="Tutup">×</button></div>
      <form id="stform" novalidate><label class="f" for="st-sel">Tahap saat ini<select class="in" id="st-sel">${TAHAP.map((t,i)=>opt(String(i),(i+1)+'. '+t,k.tahap)).join('')}</select><small>Bisa maju atau mundur. Dipakai untuk memasukkan kajian lama (backdate) atau memperbaiki tahap yang salah.</small></label>
      <div class="strows">${rows}</div><p class="note">Tanggal tahap 1 sama dengan tanggal penugasan. Tanggal harus berurutan dan tidak melewati hari ini.${k.rek?' Bila tahap dimundurkan sebelum “Disampaikan ke Direksi”, catatan hasil dan keputusan Direksi ikut dihapus.':''}</p><p class="gerr" id="st-err" hidden></p>
      <div class="mf"><button type="button" class="btn ghost" data-act="closeModal">Batal</button><button type="submit" class="btn pri">Simpan</button></div></form></div>`;
    $('#modal').hidden=false;
    $('#st-sel').addEventListener('change',e=>{const sel=+e.target.value;document.querySelectorAll('#stform .strow').forEach(r=>{r.hidden=+r.dataset.i>sel})});
    $('#stform').addEventListener('submit',ev=>{ev.preventDefault();const sel=+$('#st-sel').value;const ds=[];let err='',prev='';
      for(let i=0;i<=sel;i++){const v=$('#st-'+i).value;const e=dateErr(v,prev);if(e){err=`${i+1}. ${TAHAP[i]}: ${e}`;break}ds.push(v);prev=v}
      if(err){const e=$('#st-err');e.textContent=err;e.hidden=false;return}
      closeModal();const before=k.tahap;k.tahap=sel;k.tglTugas=ds[0];k.riwayat=ds.map((tgl,i)=>({tahap:i,tgl}));
      if(sel<6)k.rek=null;else{if(!k.rek)k.rek=emptyRek();k.rek.tglSampai=ds[6];if(sel===7){k.rek.tglKeputusan=ds[7]}else{k.rek.keputusan='Belum diputuskan';k.rek.tglKeputusan=''}}
      log(`Tahap dan tanggal tahapan diatur (tahap ${sel+1}: ${TAHAP[sel]})`,k.id);refresh();toast('Tahap dan tanggal tersimpan');
      if(sel===7&&k.rek.keputusan==='Belum diputuskan'&&before!==7)setTimeout(()=>ACT.rekForm({id:k.id}),250)});
  },
  rekForm:d=>{const k=byId(d.id);const r=k.rek||emptyRek();openForm('rek',r,'Hasil dan keputusan Direksi',v=>{const before=r.keputusan;k.rek=Object.assign(r,v);
    if(v.keputusan!=='Belum diputuskan'&&!k.rek.tglKeputusan)k.rek.tglKeputusan=TODAY;
    if(v.keputusan!=='Belum diputuskan'&&k.tahap===6){k.tahap=7;k.riwayat.push({tahap:7,tgl:k.rek.tglKeputusan||TODAY});log(`Tahap diubah ke “${TAHAP[7]}”`,k.id)}
    log(v.keputusan!==before?`Keputusan Direksi dicatat: ${v.keputusan}`:'Hasil dan rekomendasi diperbarui',k.id);refresh();
    toast(eligible(k)&&!svOf(k.id)?'Tersimpan. Kajian ini sekarang bisa dikirimi survei kepuasan.':'Hasil dan keputusan tersimpan')},esc(k.judul))},
  delKajian:d=>{const k=byId(d.id);ask('Hapus kajian ini?',`“${esc(k.judul)}” akan disembunyikan dari dashboard. Di versi jadi, data tetap tersimpan dan tercatat di riwayat.`,'Hapus',()=>{k.deleted=true;log('Kajian dihapus',k.id);closeDrawer();render();toast('Kajian dihapus')},true)},
  svGen:d=>{const k=byId(d.id);openForm('svgen',{penerima:''},'Buat link survei kepuasan',v=>{
    const s={id:uid('v'),kajian:k.id,token:newToken(),dibuat:TODAY,penerima:v.penerima,status:'Aktif',resp:[]};S.SV.push(s);
    log(`Link survei kepuasan dibuat (${s.token})`,k.id);refresh();openSv(s.id,true)},`${esc(k.judul)}<br>Pemohon: ${esc(divName(k.pemohon))}`)},
  svView:d=>openSv(d.id,false),
  svCopy:d=>{const s=S.SV.find(x=>x.id===d.id);if(d.w==='link')copyText(svUrl(s.token),'Link survei disalin.');else copyText(svMessage(s),'Pesan undangan disalin. Tempel di E-Office, email, atau WhatsApp.')},
  svPreview:d=>{const s=S.SV.find(x=>x.id===d.id);closeModal();closeDrawer();location.hash='survei-'+s.token.toLowerCase()},
  svToggle:d=>{const s=S.SV.find(x=>x.id===d.id);s.status=s.status==='Ditutup'?'Aktif':'Ditutup';log(`Survei ${s.token} ${s.status==='Ditutup'?'ditutup':'dibuka kembali'}`,s.kajian);refresh();openSv(s.id,false);toast(s.status==='Ditutup'?'Survei ditutup':'Survei dibuka kembali')},
  backSurvei:()=>{location.hash='survei'},
  backSurveiView:d=>{location.hash='survei';setTimeout(()=>openSv(d.id,false),60)},
  newData:d=>openForm('data',{kajian:d.k||'',tglMinta:TODAY,status:'Diminta'},'Catat permintaan data',v=>{S.DT.push(Object.assign({id:uid('d')},v));log(`Permintaan data dicatat: ${v.uraian||'(tanpa uraian)'}`,v.kajian);refresh();toast('Permintaan data tersimpan')}),
  editData:d=>{const x=S.DT.find(y=>y.id===d.id);openForm('data',x,'Ubah permintaan data',v=>{Object.assign(x,v);log('Permintaan data diubah',x.kajian);refresh();toast('Perubahan tersimpan')})},
  newRapat:d=>openForm('rapat',{kajian:d.k||'',tgl:TODAY,mode:'Offline',status:'Terjadwal',peserta:'Ketua dan anggota TKIN'},'Jadwalkan rapat',v=>{S.R.push(Object.assign({id:uid('r'),tl:[]},v));log(`Rapat dijadwalkan: ${v.agenda||'(tanpa agenda)'}`,v.kajian);refresh();toast('Rapat tersimpan')}),
  editRapat:d=>{const x=S.R.find(y=>y.id===d.id);openForm('rapat',x,'Ubah rapat',v=>{Object.assign(x,v);log('Data rapat diubah',x.kajian);refresh();toast('Perubahan tersimpan')})},
  newTl:d=>{const r=S.R.find(y=>y.id===d.id);openForm('tl',{},'Tambah tindak lanjut rapat',v=>{r.tl.push(Object.assign({id:uid('t'),done:false},v));log(`Tindak lanjut rapat ditambahkan: ${v.u||'(tanpa uraian)'}`,r.kajian);refresh();toast('Tindak lanjut tersimpan')},esc(r.agenda))},
  newSop:()=>openForm('sop',{jenis:'SOP',tahap:'0',revisi:0},'Tambah SOP / IK',v=>{S.SOP.push(Object.assign({id:uid('s')},v,{tahap:v.tahap===''?0:v.tahap}));log(`SOP/IK ditambahkan: ${v.judul||''}`,v.kajian);refresh();toast('SOP/IK tersimpan')}),
  editSop:d=>{const x=S.SOP.find(y=>y.id===d.id);openForm('sop',Object.assign({},x,{tahap:String(x.tahap)}),'Ubah SOP / IK',v=>{Object.assign(x,v,{tahap:v.tahap===''?0:v.tahap});log('Data SOP/IK diubah: '+x.judul,x.kajian);refresh();toast('Perubahan tersimpan')})},
  nextSop:d=>{const x=S.SOP.find(y=>y.id===d.id);const nt=x.tahap+1;ask('Pindahkan tahap SOP/IK?',`<b>${esc(x.judul)}</b> dipindahkan dari “${SOP_TAHAP[x.tahap]}” ke “${SOP_TAHAP[nt]}”.`,'Pindahkan',()=>{x.tahap=nt;if(nt===2)x.revisi=(+x.revisi||0)+1;if(nt===4&&!x.tglBerlaku)x.tglBerlaku=TODAY;log(`Tahap SOP/IK diubah ke “${SOP_TAHAP[nt]}”: ${x.judul}`,x.kajian);refresh();toast('Tahap SOP/IK diperbarui')})},
  newArsip:d=>openForm('arsip',{kajian:d.k||'',tgl:TODAY,jenis:'Working Paper',versi:'1'},'Tambah dokumen arsip',v=>{S.A.push(Object.assign({id:uid('a')},v));log(`Dokumen diarsipkan: ${v.nama||'(tanpa nama)'}`,v.kajian);refresh();toast('Dokumen tersimpan')}),
  editArsip:d=>{const x=S.A.find(y=>y.id===d.id);openForm('arsip',x,'Ubah dokumen arsip',v=>{Object.assign(x,v);log('Data dokumen diubah: '+x.nama,x.kajian);refresh();toast('Perubahan tersimpan')})},
  mAdd:d=>{const b=$('#madd-'+d.k);b.hidden=!b.hidden;if(!b.hidden)$('#madd-'+d.k+'-a').focus()},
  mCancel:d=>{$('#madd-'+d.k).hidden=true},
  mSave:d=>{const list=d.list,ia=$('#madd-'+d.k+'-a'),ib=$('#madd-'+d.k+'-b');const a=ia.value.trim().replace(/\s+/g,' '),b=ib?ib.value.trim().replace(/\s+/g,' '):'';
    if(!a){toast(list==='divisi'?'Isi singkatan divisinya dulu.':'Isi namanya dulu.');ia.focus();return}
    const key=list==='divisi'?x=>x[0]:x=>x;const found=S.M[list].find(x=>key(x).toLowerCase()===a.toLowerCase());const val=found?key(found):a;
    if(!found){S.M[list].push(list==='divisi'?[a,b||a]:a);save()}
    document.querySelectorAll(`#modal select[data-list="${list}"]`).forEach(sel=>{sel.innerHTML=mOpts(list,sel.id==='f-'+d.k?val:sel.value)});
    document.querySelectorAll(`#modal .checks[data-list="${list}"]`).forEach(c=>{const vals=[...c.querySelectorAll('.cklist input:checked')].map(i=>i.value);if(c.id==='f-'+d.k&&!vals.includes(val))vals.push(val);c.querySelector('.cklist').innerHTML=mChecks(list,vals);c.querySelector('[data-ckcount]').textContent=vals.length+' dipilih'});
    $('#madd-'+d.k).hidden=true;ia.value='';if(ib)ib.value='';
    toast(found?`“${val}” sudah ada di daftar dan sudah dipilih.`:`“${val}” ditambahkan ke daftar ${MLAB[list]}.`)},
  gatePick:d=>{if(d.role==='admin'){S.gate='admin';renderGate()}else login(d.role,ROLES[d.role])},
  gateBack:()=>{S.gate='pilih';renderGate()},
  gateShow:(d,el)=>{const i=$('#g-kode');const show=i.type==='password';i.type=show?'text':'password';el.textContent=show?'Sembunyikan':'Tampilkan';i.focus()},
  resetAsk:()=>ask('Hapus semua data uji coba?','Semua kajian, permintaan data, rapat, SOP/IK, dokumen, survei, dan riwayat yang tersimpan di browser ini akan dihapus. Daftar tambahan (divisi, jenis, nama) kembali ke awal. Tindakan ini tidak bisa dibatalkan.','Hapus semua',()=>{resetData();closeDrawer();S.view='ringkasan';try{history.replaceState(null,'','#ringkasan')}catch(_){}render();toast('Data uji coba sudah dihapus.')},true),
  skin:d=>{SKIN=d.v;document.documentElement.dataset.skin=SKIN;try{localStorage.setItem(SKIN_KEY,SKIN)}catch(_){}document.querySelectorAll('[data-act=skin]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===SKIN)))},
  logout:()=>{S.auth=null;S.gate='pilih';closeDrawer();closeModal();renderGate();toast('Anda sudah keluar.')},
  dl:d=>download(d.kind),
  copy:()=>copyTable()
};
const CHG={
  year:el=>{S.year=el.value;render()},
  reg:el=>{S.reg[el.dataset.k]=el.value;S.reg.page=1;renderRegTable()},
  ars:el=>{S.ars[el.dataset.k]=el.value;S.ars.page=1;renderArsTable()},
  ex:el=>{S.ex[el.dataset.k]=el.value;renderExPrev()},
  dataSt:el=>{const x=S.DT.find(y=>y.id===el.dataset.id);x.status=el.value;if(el.value==='Lengkap'&&!x.tglTerima)x.tglTerima=TODAY;log(`Status permintaan data diubah ke “${el.value}”: ${x.uraian}`,x.kajian);refresh();toast('Status diperbarui')},
  tl:el=>{if(!isAdmin()){el.checked=!el.checked;return}const r=S.R.find(y=>y.id===el.dataset.r);const t=r.tl.find(y=>y.id===el.dataset.t);t.done=el.checked;log(`Tindak lanjut ${t.done?'ditandai selesai':'dibuka kembali'}: ${t.u}`,r.kajian);refresh()}
};
const INP={ckq:el=>{const q=el.value.toLowerCase();el.closest('.checks').querySelectorAll('.ck').forEach(l=>{l.hidden=!l.textContent.toLowerCase().includes(q)})},regq:el=>{S.reg.q=el.value;S.reg.page=1;renderRegTable()},arsq:el=>{S.ars.q=el.value;S.ars.page=1;renderArsTable()}};
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=ACT[el.dataset.act];if(a)a(el.dataset,el,e)});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(!$('#modal').hidden)closeModal();else if(!$('#drawer').hidden)closeDrawer();return}
  if(e.key==='Enter'&&e.target.closest&&e.target.closest('.madd')){e.preventDefault();e.target.closest('.madd').querySelector('[data-act=mSave]').click();return}
  if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.inp==='ckq'){e.preventDefault();return}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('tr[data-act]')){e.preventDefault();e.target.click()}
});
document.addEventListener('change',e=>{const el=e.target;if(el.closest&&el.closest('.cklist')){const c=el.closest('.checks');c.querySelector('[data-ckcount]').textContent=c.querySelectorAll('.cklist input:checked').length+' dipilih';return}if(el.dataset&&el.dataset.chg&&CHG[el.dataset.chg])CHG[el.dataset.chg](el)});
document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.inp&&INP[el.dataset.inp])INP[el.dataset.inp](el)});
$('#drawer').addEventListener('click',e=>{if(e.target.id==='drawer')closeDrawer()});
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});

/* ================= Halaman masuk ================= */
const ROLECARDS=[['admin','Admin sekretariat','Mendaftarkan dan mengubah kajian, membuat link survei, mengekspor evidence laporan.','Perlu kode akses'],['direksi','Direksi','Memantau posisi kajian, hasil, rekomendasi, dan kepuasan pemohon.','Langsung masuk']];
function renderGate(){
  document.body.classList.add('mode-gate');document.body.classList.remove('mode-resp');
  const left=`<div class="g-l"><div class="brand"><div class="mark" aria-hidden="true">TKIN</div><div><b>Tim Kajian Internal</b><span>PT Riset Perkebunan Nusantara</span></div></div><div><h1>Dashboard kajian internal</h1><p>Register kajian, hasil dan rekomendasi kepada Direksi, survei kepuasan pemohon, dan pekerjaan sekretariat dalam satu tempat.</p></div><p class="flag">${DATA_CONTOH?'Demo · data fiktif':'Prototipe · uji coba'}</p></div>`;
  const right=S.gate==='admin'
    ?`<div class="g-r"><button type="button" class="lnk" style="align-self:flex-start" data-act="gateBack">← Pilihan masuk</button><div><h2>Masuk sebagai admin</h2><p class="muted" style="margin:8px 0 0">Gunakan kode akses dari koordinator sekretariat. Setiap admin punya kode sendiri, sehingga riwayat perubahan mencatat siapa yang mengubah data.</p></div>
      <form id="gform" novalidate><label class="f" for="g-kode">Kode akses<span class="pw"><input class="in" id="g-kode" type="password" autocomplete="off" spellcheck="false" aria-describedby="g-err"><button type="button" class="btn ghost" data-act="gateShow">Tampilkan</button></span></label><p class="gerr" id="g-err" hidden>Kode akses tidak dikenali. Periksa kembali, atau hubungi koordinator sekretariat.</p><button type="submit" class="btn pri gbtn">Masuk</button></form>
      <div class="ghint"><b>Untuk demo prototipe:</b> kode <span class="mono" style="color:var(--ink)">TKIN-ADMIN1</span> sampai <span class="mono" style="color:var(--ink)">TKIN-ADMIN5</span>, satu kode per penguji. Di versi jadi, kode tidak tampil di halaman ini.</div></div>`
    :`<div class="g-r"><h2>Masuk sebagai</h2><div class="roles-g">${ROLECARDS.map(([r,t,d,m])=>`<button type="button" class="rolecard" data-act="gatePick" data-role="${r}"><span class="rc-t">${t}</span><span class="rc-d">${d}</span><span class="rc-m">${m} →</span></button>`).join('')}</div><p class="muted" style="font-size:12.5px;margin:0">Divisi pemohon tidak masuk lewat halaman ini. Survei kepuasan dibuka langsung dari link yang dikirim.</p></div>`;
  $('#gate').innerHTML=`<div class="gwrap">${left}${right.replace('<div class="g-r">','<div class="g-r">'+skinHTML())}</div>`;
  if(S.gate==='admin'){
    $('#gform').addEventListener('submit',ev=>{ev.preventDefault();const i=$('#g-kode');const a=ADMINS.find(x=>x.kode===i.value.trim().toUpperCase());
      if(!a){$('#g-err').hidden=false;i.setAttribute('aria-invalid','true');i.select();return}login('admin',a.nama)});
    $('#g-kode').addEventListener('input',()=>{$('#g-err').hidden=true;$('#g-kode').removeAttribute('aria-invalid')});
    setTimeout(()=>{const i=$('#g-kode');i&&i.focus()},30);
  }
}
function login(role,name){S.auth={role,name};S.role=role;S.gate='pilih';S.view='ringkasan';S.open=null;try{history.replaceState(null,'','#ringkasan')}catch(_){}render();window.scrollTo(0,0);toast('Masuk sebagai '+name)}

/* ================= Routing ================= */
function go(v){if(location.hash==='#'+v)render();else location.hash=v}
function render(){
  if(!S.auth){renderGate();return}
  document.body.classList.remove('mode-resp','mode-gate');
  const acc=ACCESS[S.role];if(!acc.includes(S.view)){S.view='ringkasan';try{if(location.hash&&location.hash!=='#ringkasan')history.replaceState(null,'','#ringkasan')}catch(_){}}
  const years=[...new Set(S.K.filter(k=>!k.deleted).map(k=>k.tglTugas.slice(0,4)).concat([NOWY]))].sort().reverse();
  $('#year').innerHTML=years.map(y=>opt(y,y,S.year)).join('')+opt('Semua','Semua tahun',S.year);
  $('#year').disabled=S.view==='ekspor'||S.view==='sop';
  renderNav();
  const sk=$('#skin-slot');if(sk)sk.innerHTML=skinHTML();
  const fl=$('.bar .flag');if(fl)fl.textContent=DATA_CONTOH?'Demo · data fiktif':'Prototipe · uji coba';
  const v=VIEWS[S.view];
  $('#crumb').textContent=v.t;$('#vtitle').textContent=v.t;$('#vsub').textContent=v.s(S.role);
  $('#vacts').innerHTML=v.acts?v.acts():'';
  $('#who').innerHTML=`<div class="me"><span class="av" aria-hidden="true">${esc(initials(S.auth.name))}</span><div><b>${esc(S.auth.name)}</b><span>${S.role==='admin'?'Admin · bisa mengubah data':'Direksi · pemantauan'}</span></div></div><button type="button" class="btn sm" data-act="logout">Keluar</button>${S.role==='admin'&&!DATA_CONTOH?'<button type="button" class="lnk muted" style="font-size:11.5px;color:var(--muted)" data-act="resetAsk">Hapus semua data uji coba</button>':''}`;
  $('#view').innerHTML=v.fn();
  if(v.after)v.after();
}
function fromHash(){
  const h=location.hash.replace('#','');
  if(h.startsWith('survei-')){S.resp=h.slice(7);S.respDone=false;closeDrawer();closeModal();document.body.classList.add('mode-resp');renderResp();window.scrollTo(0,0);return}
  S.resp=null;document.body.classList.remove('mode-resp');if(!S.auth){closeDrawer();renderGate();return}
  S.view=VIEWS[h]?h:'ringkasan';closeDrawer();render();window.scrollTo(0,0);
}
window.addEventListener('hashchange',fromHash);
if(DATA_CONTOH)seed();else load();
fromHash();
setTimeout(getDL,0);