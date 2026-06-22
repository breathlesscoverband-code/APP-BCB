/* APP-BCB · novedades v7.0 estable */
(function(){
  const NEWS_VERSION = '7.0.0-estable';
  const KEY = 'app_bcb_news_seen_' + NEWS_VERSION;

  function shouldShow(){
    try { return localStorage.getItem(KEY) !== '1'; } catch(e){ return true; }
  }
  function markSeen(){
    try { localStorage.setItem(KEY, '1'); } catch(e){}
  }
  function close(){
    const el=document.getElementById('appBcbNewsModal');
    if(el) el.remove();
    markSeen();
  }
  function show(){
    if(!shouldShow()) return;
    const wrap=document.createElement('div');
    wrap.id='appBcbNewsModal';
    wrap.className='newsOverlay';
    wrap.innerHTML=`
      <div class="newsModal">
        <div class="newsEyebrow">Actualización APP-BCB</div>
        <h2>Novedades APP-BCB v7.0</h2>
        <p class="newsSub">Versión estable completa para trabajar con datos reales de Google Sheet.</p>
        <div class="newsBadges"><span>Breathless Cover Band</span><span>v7.0</span></div>
        <ul class="newsList">
          <li>Se elimina el sistema que forzaba siempre 32 canciones y podía pisar cambios reales.</li>
          <li>Ensayos y pagos vuelven a usar Google Sheet como fuente principal.</li>
          <li>Dar de baja una canción la marca como Descartada y la retira del Setlist.</li>
          <li>Se actualiza la caché de la app para evitar mezclas de versiones antiguas.</li>
        </ul>
        <button class="newsButton" id="appBcbNewsClose">Entrar en la app</button>
      </div>`;
    document.body.appendChild(wrap);
    document.getElementById('appBcbNewsClose')?.addEventListener('click', close);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', show);
  else show();
})();
