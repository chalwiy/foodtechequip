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
