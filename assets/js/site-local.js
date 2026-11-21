(function(){
"use strict"; const t=s=>(window.FTE_I18N||{})[s]||s;
const lang=document.documentElement.lang.split('-')[0];
function formatResults(total,start,end){
 const ranges={ja:`${total}件${total?`・${start}–${end}件を表示`:''}`,ko:`${total}개 제품${total?` · ${start}–${end} 표시`:''}`,vi:`${total} sản phẩm${total?` · Hiển thị ${start}–${end}`:''}`,th:`${total} รายการ${total?` · แสดง ${start}–${end}`:''}`};
 if(ranges[lang])return ranges[lang];
 if(lang==='ru'){const form=new Intl.PluralRules('ru').select(total);const noun={one:'товар',few:'товара',many:'товаров',other:'товара'}[form];return `${total} ${noun}${total?` · Показано ${start}–${end}`:''}`;}
 return `${total} ${total===1?t('product'):t('products')}${total?` · ${t('Showing')} ${start}–${end}`:''}`;
}
function formatPage(page,pages){const labels={ja:`${page} / ${pages} ページ`,ko:`${page} / ${pages} 페이지`,vi:`Trang ${page} / ${pages}`,th:`หน้า ${page} / ${pages}`,ar:`الصفحة ${page} من ${pages}`,ru:`Страница ${page} из ${pages}`,es:`Página ${page} de ${pages}`,fr:`Page ${page} sur ${pages}`,de:`Seite ${page} von ${pages}`,pt:`Página ${page} de ${pages}`};return labels[lang]||`Page ${page} of ${pages}`;}

function normalizeCatalogSearch(s){return s.toLocaleLowerCase().normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g,'').replace(/đ/g,'d');}

document.documentElement.classList.add('js-ready');
 const normalizeSearch=normalizeCatalogSearch;
 document.querySelectorAll('input,textarea').forEach(field=>{
  field.addEventListener('invalid',()=>field.setCustomValidity(t(field.validity.typeMismatch?'Please enter a valid email address.':'Please complete this field.')));
  field.addEventListener('input',()=>field.setCustomValidity(''));
 });
 document.querySelectorAll('.language-switcher a').forEach(a=>a.addEventListener('click',()=>{
  const dest=new URL(a.href);const current=new URL(location.href);
  for(const key of ['q','category'])if(current.searchParams.has(key))dest.searchParams.set(key,current.searchParams.get(key));
  if(current.searchParams.has('product'))dest.searchParams.set('product',current.searchParams.get('product'));
  const productPage=current.searchParams.get('page');
  if(productPage){try{const u=new URL(productPage);if(u.origin==='https://www.foodtechequip.com'){
   const codes=['es','ar','ru','fr','de','pt','ja','ko','vi','th'];const parts=u.pathname.split('/').filter(Boolean);
   if(codes.includes(parts[0]))parts.shift();const selected=a.hreflang.split('-')[0];if(selected!=='en')parts.unshift(selected);
   u.pathname='/'+parts.join('/')+(u.pathname.endsWith('/')?'/':'');dest.searchParams.set('page',u.href);
  }}catch{}}
  a.href=dest.href;
 }));
 
const menu=document.querySelector('[data-menu-toggle]');
const nav=document.getElementById('navigation');
if(menu&&nav){menu.hidden=false;menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?t("Close navigation"):t("Open navigation"));nav.classList.toggle('is-open',open);});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open')){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label',t("Open navigation"));menu.focus();}});}
const catalogue=document.querySelector('[data-catalogue]');
if(catalogue){
 const cards=[...catalogue.querySelectorAll('[data-product-card]')];const search=catalogue.querySelector('[data-search-input]');const select=catalogue.querySelector('[data-category-filter]');const counter=catalogue.querySelector('[data-results-count]');const pagination=catalogue.querySelector('[data-pagination]');const prev=catalogue.querySelector('[data-prev]');const next=catalogue.querySelector('[data-next]');const status=catalogue.querySelector('[data-page-status]');const empty=catalogue.querySelector('[data-no-results]');const form=catalogue.querySelector('[data-filter-form]');
 let page=1;const size=12;const params=new URLSearchParams(location.search);search.value=params.get('q')||'';if([...select.options].some(o=>o.value===params.get('category')))select.value=params.get('category');form.hidden=false;
 function render(){const words=normalizeSearch(search.value).trim().split(/\s+/).filter(Boolean);const matched=cards.filter(card=>(!select.value||card.dataset.category===select.value)&&words.every(word=>normalizeSearch(card.dataset.search).includes(word)));const pages=Math.max(1,Math.ceil(matched.length/size));page=Math.max(1,Math.min(page,pages));cards.forEach(card=>card.hidden=true);matched.slice((page-1)*size,page*size).forEach(card=>card.hidden=false);counter.textContent=formatResults(matched.length,(page-1)*size+1,Math.min(page*size,matched.length));empty.hidden=matched.length>0;pagination.hidden=matched.length<=size;prev.disabled=page===1;next.disabled=page===pages;status.textContent=formatPage(page,pages);const url=new URL(location.href);if(search.value.trim())url.searchParams.set('q',search.value.trim());else url.searchParams.delete('q');if(select.value)url.searchParams.set('category',select.value);else url.searchParams.delete('category');if(location.protocol!=='file:'){try{history.replaceState({},'',url);}catch{ /* Address updates are optional; filtering remains available. */ }}}
 form.addEventListener('submit',e=>{e.preventDefault();page=1;render();});search.addEventListener('input',()=>{page=1;render();});select.addEventListener('change',()=>{page=1;render();});catalogue.querySelectorAll('[data-reset]').forEach(button=>button.addEventListener('click',()=>{search.value='';select.value='';page=1;render();search.focus();}));prev.addEventListener('click',()=>{page--;render();form.scrollIntoView({block:'start'});});next.addEventListener('click',()=>{page++;render();form.scrollIntoView({block:'start'});});render();
}
((photos) => {
  const labels = {
    en: ['Additional view', 'Equipment detail'],
    es: ['Vista adicional', 'Detalle del equipo'],
    ar: ['منظر إضافي', 'تفاصيل المعدة'],
    ru: ['Дополнительный ракурс', 'Деталь оборудования'],
    fr: ['Autre vue', 'Détail de la machine'],
    de: ['Weitere Ansicht', 'Maschinendetail'],
    pt: ['Vista adicional', 'Detalhe do equipamento'],
    ja: ['別の角度', '装置の詳細'],
    ko: ['다른 각도', '장비 세부'],
    vi: ['Góc nhìn khác', 'Chi tiết thiết bị'],
    th: ['มุมมองเพิ่มเติม', 'รายละเอียดเครื่อง'],
  };
  const aiLabels = {
    en: 'AI-generated illustration',
    es: 'Ilustración generada por IA',
    ar: 'رسم توضيحي مولّد بالذكاء الاصطناعي',
    ru: 'Иллюстрация, созданная ИИ',
    fr: 'Illustration générée par IA',
    de: 'KI-generierte Illustration',
    pt: 'Ilustração gerada por IA',
    ja: 'AI生成のイメージ図',
    ko: 'AI 생성 예시 이미지',
    vi: 'Hình minh họa do AI tạo',
    th: 'ภาพประกอบที่สร้างด้วย AI',
  };
  const detailLabels = {
    en: ['Control panel', 'Conveyor and frame', 'Hopper', 'Equipment housing', 'Sealing assembly', 'Support and base', 'Film roll and support'],
    es: ['Panel de control', 'Transportador y bastidor', 'Tolva', 'Carcasa del equipo', 'Conjunto de sellado', 'Soporte y base', 'Bobina de película y soporte'],
    ar: ['لوحة التحكم', 'الناقل والهيكل', 'قادوس التغذية', 'غلاف المعدة', 'مجموعة الإغلاق', 'الدعامة والقاعدة', 'لفة الفيلم وحاملها'],
    ru: ['Панель управления', 'Конвейер и рама', 'Загрузочный бункер', 'Корпус оборудования', 'Узел запайки', 'Опора и основание', 'Рулон плёнки и опора'],
    fr: ['Panneau de commande', 'Convoyeur et bâti', 'Trémie', 'Carter de la machine', 'Ensemble de scellage', 'Support et socle', 'Bobine de film et support'],
    de: ['Bedienfeld', 'Förderband und Rahmen', 'Trichter', 'Maschinengehäuse', 'Siegeleinheit', 'Stütze und Sockel', 'Folienrolle und Halterung'],
    pt: ['Painel de controle', 'Esteira e estrutura', 'Funil de alimentação', 'Carcaça do equipamento', 'Conjunto de selagem', 'Suporte e base', 'Bobina de filme e suporte'],
    ja: ['操作パネル', 'コンベヤーとフレーム', 'ホッパー', '装置の筐体', '封止部', '支柱とベース', 'フィルムロールと支持部'],
    ko: ['조작 패널', '컨베이어와 프레임', '호퍼', '장비 외함', '실링부', '지지대와 받침대', '필름 롤과 지지대'],
    vi: ['Bảng điều khiển', 'Băng tải và khung', 'Phễu cấp liệu', 'Vỏ thiết bị', 'Cụm hàn kín', 'Giá đỡ và đế', 'Cuộn màng và giá đỡ'],
    th: ['แผงควบคุม', 'สายพานและโครงเครื่อง', 'ถังป้อน', 'ตัวเรือนเครื่อง', 'ชุดซีล', 'ขาตั้งและฐาน', 'ม้วนฟิล์มและชุดรองรับ'],
  };
  const detailKinds = ['control', 'conveyor', 'hopper', 'housing', 'seal', 'base', 'film'];
  const language = document.documentElement.lang.split('-')[0];
  const names = labels[language] || labels.en;
  const disclosure = aiLabels[language] || aiLabels.en;
  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    if (gallery.querySelector('[data-gallery-thumb]')) return;
    const main = gallery.querySelector('[data-open-image]');
    if (!main) return;
    const src = new URL(main.href);
    const product = src.pathname.split('/').at(-2);
    const additional = photos[product];
    if (!additional?.length) return;

    const track = document.createElement('div');
    track.className = 'gallery-thumbs';
    const mainImage = main.querySelector('img');
    const views = [{
      src: mainImage.getAttribute('src'),
      srcset: mainImage.getAttribute('srcset') || '',
      thumbnail: mainImage.currentSrc || mainImage.src,
      full: main.href,
      alt: mainImage.alt,
    }, ...additional.map(({file, detail, generated, subject}) => {
      const url = new URL(file, src).href;
      const description = (detailLabels[language] || detailLabels.en)[detailKinds.indexOf(subject)] || names[detail ? 1 : 0];
      const alt = generated ? disclosure + ' · ' + description : description;
      return {src: url, srcset: '', thumbnail: url, full: url, alt, generated};
    })];

    views.forEach((view, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-gallery-thumb', '');
      button.setAttribute('aria-label', view.alt + ' (' + (index + 1) + ')');
      button.setAttribute('aria-pressed', String(index === 0));
      for (const key of ['src', 'srcset', 'full', 'alt']) button.dataset[key] = view[key];
      if (view.generated) button.setAttribute('data-gallery-generated', '');
      const thumbnail = new Image(80, 80);
      thumbnail.loading = 'lazy';
      thumbnail.alt = '';
      thumbnail.src = view.thumbnail;
      button.append(thumbnail);
      track.append(button);
    });
    main.after(track);
    const dialog = gallery.querySelector('[data-image-dialog]');
    if (dialog && additional.some(view => view.generated)) {
      const note = document.createElement('p');
      note.className = 'gallery-dialog-caption';
      note.textContent = disclosure;
      note.hidden = true;
      dialog.querySelector('img').after(note);
      main.addEventListener('click', () => {
        const selected = track.querySelector('[aria-pressed="true"]');
        note.hidden = !selected?.hasAttribute('data-gallery-generated');
      });
    }
  });
})({"1077691947467": [{"file": "reference-3a2ccb05806d01b0.jpg", "detail": false}, {"file": "reference-50e1af9c0e47705e.jpg", "detail": false}], "729555188484": [{"file": "reference-acc53e7f591f3cd7.webp", "detail": false}], "1048965380308": [{"file": "reference-7709d836d34c8536.webp", "detail": false}], "723245603487": [{"file": "reference-6da9f0df33608188.webp", "detail": false}], "722585551368": [{"file": "reference-c67cdf826dc4a981.webp", "detail": true}], "972692626501": [{"file": "reference-0c697ceb0c778446.webp", "detail": false}], "784389448901": [{"file": "reference-1e9e8676e259876d.jpg", "detail": false}], "1010180505838": [{"file": "ai-detail-917355a4c42a4f04.webp", "detail": true, "generated": true, "subject": "housing"}], "1053951825775": [{"file": "ai-detail-f3c7a9d38ec0e4bb.webp", "detail": true, "generated": true, "subject": "housing"}], "725970353114": [{"file": "ai-detail-e3eeb1a4d1a3caf1.webp", "detail": true, "generated": true, "subject": "control"}], "968768114100": [{"file": "ai-detail-3e30b501b6e18370.webp", "detail": true, "generated": true, "subject": "hopper"}], "908020115925": [{"file": "ai-detail-3e2f0575350cf41a.webp", "detail": true, "generated": true, "subject": "seal"}], "908820477399": [{"file": "ai-detail-f47d582e92665859.webp", "detail": true, "generated": true, "subject": "control"}], "837900151832": [{"file": "ai-detail-2e5cee77514effdd.webp", "detail": true, "generated": true, "subject": "housing"}], "992552940594": [{"file": "ai-detail-5258007260248f57.webp", "detail": true, "generated": true, "subject": "housing"}], "949410575298": [{"file": "ai-detail-c15d7c7349666075.webp", "detail": true, "generated": true, "subject": "base"}], "730145777686": [{"file": "ai-detail-ec73a552c33d99fb.webp", "detail": true, "generated": true, "subject": "conveyor"}], "1009180552173": [{"file": "ai-detail-ba3db724b141938f.webp", "detail": true, "generated": true, "subject": "base"}], "724932564275": [{"file": "ai-detail-a143e76cda9978c8.webp", "detail": true, "generated": true, "subject": "housing"}], "887293940737": [{"file": "ai-detail-05d4552d173b49e2.webp", "detail": true, "generated": true, "subject": "conveyor"}], "906140569299": [{"file": "ai-detail-dd75c1b17c2d5d55.webp", "detail": true, "generated": true, "subject": "conveyor"}], "1080758367491": [{"file": "ai-detail-9bceac5feb4c8027.webp", "detail": true, "generated": true, "subject": "conveyor"}], "941239292511": [{"file": "ai-detail-6bc37c59e0411724.webp", "detail": true, "generated": true, "subject": "conveyor"}], "905325079297": [{"file": "ai-detail-bbcfca3799382196.webp", "detail": true, "generated": true, "subject": "housing"}], "722911021612": [{"file": "ai-detail-22230259d541e1cd.webp", "detail": true, "generated": true, "subject": "hopper"}], "969505834749": [{"file": "ai-detail-a8608eb3077afdfd.webp", "detail": true, "generated": true, "subject": "housing"}], "905083752930": [{"file": "ai-detail-9e4b9fcffaa8ae73.webp", "detail": true, "generated": true, "subject": "housing"}], "978129925071": [{"file": "ai-detail-b0700c31bf2c3ebf.webp", "detail": true, "generated": true, "subject": "base"}], "1031495588952": [{"file": "ai-detail-9c4d4a707a078bf5.webp", "detail": true, "generated": true, "subject": "base"}], "949413523090": [{"file": "ai-detail-7e30a5cedb51c967.webp", "detail": true, "generated": true, "subject": "housing"}], "1081890504492": [{"file": "ai-detail-2ba4b2af5bb0b737.webp", "detail": true, "generated": true, "subject": "base"}], "944576075101": [{"file": "ai-detail-49d5f0a94790e40e.webp", "detail": true, "generated": true, "subject": "conveyor"}], "934574713388": [{"file": "ai-detail-bfb3c78aa44ab15b.webp", "detail": true, "generated": true, "subject": "hopper"}], "720800309358": [{"file": "ai-detail-3097199268667ae1.webp", "detail": true, "generated": true, "subject": "hopper"}], "722404602245": [{"file": "ai-detail-c3f2d43a1e391152.webp", "detail": true, "generated": true, "subject": "hopper"}], "776741555135": [{"file": "ai-detail-9f87925874c957c7.webp", "detail": true, "generated": true, "subject": "hopper"}], "1060024634091": [{"file": "ai-detail-0eef6fb724f62454.webp", "detail": true, "generated": true, "subject": "control"}], "1009168888996": [{"file": "ai-detail-7941e38366860398.webp", "detail": true, "generated": true, "subject": "housing"}], "900323505289": [{"file": "ai-detail-ee1399dc485453da.webp", "detail": true, "generated": true, "subject": "base"}], "904068968850": [{"file": "ai-detail-ae222f86a3c07192.webp", "detail": true, "generated": true, "subject": "base"}], "955118363383": [{"file": "ai-detail-e37c2267b10d7a4d.webp", "detail": true, "generated": true, "subject": "hopper"}], "1038479417903": [{"file": "ai-detail-9550c4cc60f62c0a.webp", "detail": true, "generated": true, "subject": "conveyor"}], "961539437756": [{"file": "ai-detail-304f03edebde2ae5.webp", "detail": true, "generated": true, "subject": "control"}], "1081882140922": [{"file": "ai-detail-1a8dc0001021814b.webp", "detail": true, "generated": true, "subject": "base"}], "721167827639": [{"file": "ai-detail-71f8144455cfd2e8.webp", "detail": true, "generated": true, "subject": "housing"}], "829397999832": [{"file": "ai-detail-b00172ae24ea73ad.webp", "detail": true, "generated": true, "subject": "housing"}], "941980849566": [{"file": "ai-detail-8d09f04e58f3b53c.webp", "detail": true, "generated": true, "subject": "hopper"}], "726438559901": [{"file": "ai-detail-e6284109ccab0b34.webp", "detail": true, "generated": true, "subject": "hopper"}], "971356827102": [{"file": "ai-detail-0cf685976ec34308.webp", "detail": true, "generated": true, "subject": "conveyor"}], "720981522478": [{"file": "ai-detail-6cb27007984d850a.webp", "detail": true, "generated": true, "subject": "housing"}], "959618311970": [{"file": "ai-detail-3c3952a5f9771c95.webp", "detail": true, "generated": true, "subject": "base"}], "906517216120": [{"file": "ai-detail-1ce28a192044d8ae.webp", "detail": true, "generated": true, "subject": "housing"}], "940105402496": [{"file": "ai-detail-7d48ae7db157114e.webp", "detail": true, "generated": true, "subject": "housing"}], "1084252028493": [{"file": "ai-detail-d15284701883582c.webp", "detail": true, "generated": true, "subject": "housing"}], "929227718837": [{"file": "ai-detail-16d0bf1702688d01.webp", "detail": true, "generated": true, "subject": "base"}], "1006978427204": [{"file": "ai-detail-fedc3a37cde0fc57.webp", "detail": true, "generated": true, "subject": "base"}], "1030691365198": [{"file": "ai-detail-222182c25cf2dc4d.webp", "detail": true, "generated": true, "subject": "conveyor"}], "1043538033754": [{"file": "ai-detail-ee34ac51b2f7a4e8.webp", "detail": true, "generated": true, "subject": "housing"}], "1053955877453": [{"file": "ai-detail-f2edda54b27b621c.webp", "detail": true, "generated": true, "subject": "housing"}], "950507953145": [{"file": "ai-detail-316790f318dcfa2e.webp", "detail": true, "generated": true, "subject": "housing"}], "943797511358": [{"file": "ai-detail-b43d339f52081dfb.webp", "detail": true, "generated": true, "subject": "conveyor"}], "739812987120": [{"file": "ai-detail-b9cfb0b95602f439.webp", "detail": true, "generated": true, "subject": "control"}], "909230644061": [{"file": "ai-detail-e932d748e1c0636f.webp", "detail": true, "generated": true, "subject": "seal"}], "725658259417": [{"file": "ai-detail-16a8f1c54a2cea21.webp", "detail": true, "generated": true, "subject": "seal"}], "908816297082": [{"file": "ai-detail-c71e9323725437c1.webp", "detail": true, "generated": true, "subject": "housing"}], "925772490830": [{"file": "ai-detail-65d5a72d2b4ce771.webp", "detail": true, "generated": true, "subject": "housing"}], "1081898256309": [{"file": "ai-detail-651793f24e2c5400.webp", "detail": true, "generated": true, "subject": "base"}], "774408630664": [{"file": "ai-detail-be0572daabc08dba.webp", "detail": true, "generated": true, "subject": "base"}], "839828064762": [{"file": "ai-detail-12b15f41ca68e938.webp", "detail": true, "generated": true, "subject": "base"}], "855766415925": [{"file": "ai-detail-e2ea0a6f0bfd7784.webp", "detail": true, "generated": true, "subject": "base"}], "875058492303": [{"file": "ai-detail-8d5902f5846879cc.webp", "detail": true, "generated": true, "subject": "base"}], "904206722343": [{"file": "ai-detail-9785ba5bab2cf03f.webp", "detail": true, "generated": true, "subject": "base"}], "942436410624": [{"file": "ai-detail-5125631f2a4e3a2d.webp", "detail": true, "generated": true, "subject": "base"}], "974016564991": [{"file": "ai-detail-5d4c6cbeffed914e.webp", "detail": true, "generated": true, "subject": "base"}], "922936641148": [{"file": "ai-detail-40a51687dad46fc5.webp", "detail": true, "generated": true, "subject": "control"}], "943096100346": [{"file": "ai-detail-a458221e670b080e.webp", "detail": true, "generated": true, "subject": "base"}], "1008105599610": [{"file": "ai-detail-82239680117da1ea.webp", "detail": true, "generated": true, "subject": "base"}], "934574713992": [{"file": "ai-detail-301cb0919fa4b9da.webp", "detail": true, "generated": true, "subject": "base"}], "978783472052": [{"file": "ai-detail-4108906de12ac4a4.webp", "detail": true, "generated": true, "subject": "base"}], "723600368380": [{"file": "ai-detail-b4b93442606eddb5.webp", "detail": true, "generated": true, "subject": "seal"}], "724174215239": [{"file": "ai-detail-8633c23cf35adb71.webp", "detail": true, "generated": true, "subject": "conveyor"}], "968763103269": [{"file": "ai-detail-7905bc66c4db10a1.webp", "detail": true, "generated": true, "subject": "housing"}], "1083557533478": [{"file": "ai-detail-44ea1e4bd4f3b705.webp", "detail": true, "generated": true, "subject": "film"}], "986932525571": [{"file": "ai-detail-f1b9ea6a5723e29f.webp", "detail": true, "generated": true, "subject": "base"}], "1002167429790": [{"file": "ai-detail-44e386a17a94477f.webp", "detail": true, "generated": true, "subject": "base"}], "722369243942": [{"file": "ai-detail-446b9bc496b73bb6.webp", "detail": true, "generated": true, "subject": "base"}], "821352619205": [{"file": "ai-detail-96b26b2e617af58d.webp", "detail": true, "generated": true, "subject": "conveyor"}], "721803280149": [{"file": "ai-detail-98ac6368e643aa91.webp", "detail": true, "generated": true, "subject": "hopper"}], "994521160945": [{"file": "ai-detail-44ba4de37540d2e2.webp", "detail": true, "generated": true, "subject": "hopper"}], "968603757879": [{"file": "ai-detail-2fca1ab68c628e47.webp", "detail": true, "generated": true, "subject": "base"}], "721933331652": [{"file": "ai-detail-2f1c65b1c1f541f1.webp", "detail": true, "generated": true, "subject": "hopper"}]});

document.querySelectorAll('[data-gallery]').forEach(gallery=>{const main=gallery.querySelector('[data-open-image]');const img=main.querySelector('img');const dialog=gallery.querySelector('[data-image-dialog]');let opener;
gallery.querySelectorAll('[data-gallery-thumb]').forEach(button=>button.addEventListener('click',()=>{img.src=button.dataset.src;img.srcset=button.dataset.srcset;img.alt=button.dataset.alt;main.href=button.dataset.full;const caption=gallery.querySelector('[data-gallery-caption]');if(caption)caption.textContent=button.dataset.alt;gallery.querySelectorAll('[data-gallery-thumb]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
main.addEventListener('click',e=>{if(typeof dialog.showModal!=='function')return;e.preventDefault();opener=main;const large=dialog.querySelector('img');large.src=main.href;large.alt=img.alt;dialog.showModal();});dialog.querySelector('[data-close-dialog]').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>opener?.focus());});
const inquiry=document.querySelector('[data-inquiry-form]');
if(inquiry){const params=new URLSearchParams(location.search);const product=params.get('product')||'';let page=params.get('page')||'';try{if(inquiry.dataset.confirmed!=='true'||new URL(page).protocol!=='https:'||new URL(page).origin!==inquiry.dataset.origin)page='';}catch{page='';}inquiry.elements.namedItem('product').value=product;inquiry.elements.namedItem('page').value=page;inquiry.hidden=false;const output=document.querySelector('[data-generated-inquiry]');const text=document.querySelector('[data-inquiry-text]');const copyStatus=document.querySelector('[data-copy-status]');
inquiry.addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(inquiry));const labels={product:t("Equipment"),material:t("Material / product"),packaging:t("Packaging / batch details"),output:t("Required output / batch size"),power:t("Power supply"),destination:t("Destination"),name:t("Name / company"),email:t("Email"),message:t("Additional requirements"),page:t("Product page")};const lines=[`${t('Hello')} ${inquiry.dataset.contact},`,'', t("I would like to enquire about equipment from FTE."),''];for(const [key,label]of Object.entries(labels))if(String(values[key]||'').trim())lines.push(`${label}: ${String(values[key]).trim()}`);lines.push('',t("Please advise on suitable equipment and quotation details."));text.value=lines.join('\n');output.hidden=false;const message=text.value;document.querySelector('[data-email-inquiry]').href=`mailto:${inquiry.dataset.email}?subject=${encodeURIComponent(t("Equipment enquiry")+(values.product?' — '+values.product:''))}&body=${encodeURIComponent(message)}`;document.querySelector('[data-whatsapp-inquiry]').href=inquiry.dataset.whatsapp+'?text='+encodeURIComponent(message);copyStatus.textContent=t("Enquiry text prepared. Choose how to contact FTE.");text.focus();});
document.querySelector('[data-copy-inquiry]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(text.value);copyStatus.textContent=t("Enquiry text copied.");}catch{text.focus();text.select();copyStatus.textContent=t("Automatic copying is unavailable. The text is selected; press Ctrl+C (or use your device\u2019s copy command).");}});
}

})();

(() => {
  document.querySelectorAll('.language-switcher').forEach(menu => {
    const trigger = menu.querySelector('summary');
    const links = [...menu.querySelectorAll('a')];
    const close = (restoreFocus = false) => { menu.open = false; trigger.setAttribute('aria-expanded', 'false'); if (restoreFocus) trigger.focus(); };
    trigger.setAttribute('aria-expanded', String(menu.open));
    menu.addEventListener('toggle', () => trigger.setAttribute('aria-expanded', String(menu.open)));
    document.addEventListener('click', event => { if (!menu.contains(event.target)) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { event.preventDefault(); close(menu.contains(document.activeElement)); } });
    menu.addEventListener('focusout', () => { setTimeout(() => { if (!menu.contains(document.activeElement)) close(); }, 0); });
    menu.addEventListener('keydown', event => {
      const index = links.indexOf(document.activeElement);
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault(); menu.open = true; trigger.setAttribute('aria-expanded', 'true');
        let next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : index < 0 ? (event.key === 'ArrowUp' ? links.length - 1 : 0) : (index + (event.key === 'ArrowUp' ? -1 : 1) + links.length) % links.length;
        links[next].focus();
      }
    });
    document.querySelector('[data-menu-toggle]')?.addEventListener('click', () => close());
  });
})();

(() => {
  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const track = gallery.querySelector('.gallery-thumbs');
    const buttons = track ? [...track.querySelectorAll('[data-gallery-thumb]')] : [];
    if (buttons.length < 2) return;

    const main = gallery.querySelector('[data-open-image]');
    const info = document.createElement('div');
    const caption = gallery.querySelector('[data-gallery-caption]') ?? document.createElement('p');
    const count = document.createElement('span');
    const number = new Intl.NumberFormat(document.documentElement.lang || 'en');
    info.className = 'gallery-view-info';
    info.setAttribute('aria-live', 'polite');
    info.setAttribute('aria-atomic', 'true');
    caption.setAttribute('data-gallery-caption', '');
    count.className = 'gallery-view-count';
    info.append(caption, count);
    main.after(info);
    track.classList.add('gallery-view-strip');

    function showCaption(button, index) {
      caption.textContent = button.dataset.alt || button.getAttribute('aria-label') || '';
      count.textContent = number.format(index + 1) + ' / ' + number.format(buttons.length);
    }

    const active = Math.max(0, buttons.findIndex(button => button.getAttribute('aria-pressed') === 'true'));
    showCaption(buttons[active], active);
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => showCaption(button, index));
      button.addEventListener('keydown', event => {
        const rtl = getComputedStyle(track).direction === 'rtl';
        let next;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else if (event.key === 'ArrowLeft') next = index + (rtl ? 1 : -1);
        else if (event.key === 'ArrowRight') next = index + (rtl ? -1 : 1);
        else return;
        event.preventDefault();
        const target = buttons[Math.min(buttons.length - 1, Math.max(0, next))];
        target.focus({preventScroll: true});
        target.click();
        target.scrollIntoView({block: 'nearest', inline: 'nearest'});
      });
    });
  });
})();
