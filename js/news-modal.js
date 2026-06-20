/* APP-BCB Â· Pantalla automÃ¡tica de novedades Â· v5.3
   Sistema interno: sin JSON externo y sin mantenimiento manual.
   Se muestra al abrir la app si NEWS.items contiene novedades activas. */
(function(){
  "use strict";
  var NEWS = {
    active: true,
    version: "5.3",
    band: "Breathless Cover Band",
    app: "APP-BCB",
    title: "Novedades APP-BCB v5.3",
    subtitle: "ActualizaciÃ³n automÃ¡tica de entrada",
    date: "2026-06-16",
    showMode: "every-open",
    items: [
      "Nueva pantalla de novedades al entrar en la app cuando haya cambios activos.",
      "Funcionamiento integrado dentro de la app: sin JSON externo y sin ediciÃ³n manual.",
      "Compatible con el mÃ³dulo Pistas ya publicado en la app pÃºblica.",
      "Se mantiene separada de Ã‘ MayÃºscula: contenidos, textos y versiÃ³n propios de BCB."
    ]
  };
  function ready(fn){ if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",fn,{once:true});}else{fn();} }
  function esc(s){ return String(s).replace(/[&<>]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[ch];}); }
  function hasNews(){ return !!(NEWS && NEWS.active && Array.isArray(NEWS.items) && NEWS.items.length > 0); }
  function closeNews(){
    var overlay=document.getElementById("appNewsOverlay");
    if(!overlay) return;
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden","true");
    setTimeout(function(){ if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); },180);
  }
  function buildNewsModal(){
    if(!hasNews() || document.getElementById("appNewsOverlay")) return;
    var overlay=document.createElement("div");
    overlay.id="appNewsOverlay";
    overlay.className="app-news-overlay";
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-labelledby","appNewsTitle");
    overlay.setAttribute("aria-hidden","true");
    var itemsHtml=NEWS.items.map(function(item){ return "<li>"+esc(item)+"</li>"; }).join("");
    overlay.innerHTML =
      '<div class="app-news-card">' +
      '<div class="app-news-kicker">ActualizaciÃ³n de la app</div>' +
      '<h2 id="appNewsTitle">'+esc(NEWS.title)+'</h2>' +
      '<p class="app-news-subtitle">'+esc(NEWS.subtitle)+'</p>' +
      '<div class="app-news-meta"><span>'+esc(NEWS.band)+'</span><span>VersiÃ³n '+esc(NEWS.version)+'</span><span>'+esc(NEWS.date)+'</span></div>' +
      '<ul class="app-news-list">'+itemsHtml+'</ul>' +
      '<div class="app-news-actions"><button type="button" class="btn gold app-news-enter" id="appNewsCloseBtn">Entrar en la app</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    var btn=document.getElementById("appNewsCloseBtn");
    if(btn) btn.addEventListener("click",closeNews);
    overlay.addEventListener("click",function(ev){ if(ev.target===overlay) closeNews(); });
    document.addEventListener("keydown",function(ev){ if(ev.key==="Escape") closeNews(); },{once:true});
    requestAnimationFrame(function(){ overlay.setAttribute("aria-hidden","false"); overlay.classList.add("is-visible"); if(btn) btn.focus({preventScroll:true}); });
  }
  ready(function(){ setTimeout(buildNewsModal,250); });
  window.APP_NEWS = NEWS;
})();
