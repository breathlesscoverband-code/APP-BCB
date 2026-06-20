/* APP-BCB · Pantalla automática de novedades · v5.9 */
(function(){
  "use strict";
  var NEWS = {
    active: true,
    version: "5.9",
    band: "Breathless Cover Band",
    app: "APP-BCB",
    title: "Novedades APP-BCB v5.9",
    subtitle: "Guardado estable y setlist actualizado",
    date: "2026-06-20",
    showMode: "every-open",
    items: [
      "Setlist v11 actualizado en la app.",
      "Corrección de guardado en ensayos, pagos de local y repertorio.",
      "Mejoras para que los cambios confirmados no dependan de la caché del navegador."
    ]
  };

  function ready(fn){
    if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",fn,{once:true});}
    else{fn();}
  }

  function esc(s){
    return String(s).replace(/[&<>]/g,function(ch){
      return {"&":"&amp;","<":"&lt;",">":"&gt;"}[ch];
    });
  }

  function hasNews(){
    return !!(NEWS && NEWS.active && Array.isArray(NEWS.items) && NEWS.items.length > 0);
  }

  function closeNews(){
    var overlay=document.getElementById("appNewsOverlay");
    if(!overlay) return;
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden","true");
    setTimeout(function(){
      if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    },180);
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
      '<div class="app-news-kicker">Actualización de la app</div>' +
      '<h2 id="appNewsTitle">'+esc(NEWS.title)+'</h2>' +
      '<p class="app-news-subtitle">'+esc(NEWS.subtitle)+'</p>' +
      '<div class="app-news-meta"><span>'+esc(NEWS.band)+'</span><span>Versión '+esc(NEWS.version)+'</span><span>'+esc(NEWS.date)+'</span></div>' +
      '<ul class="app-news-list">'+itemsHtml+'</ul>' +
      '<div class="app-news-actions"><button type="button" class="btn gold app-news-enter" id="appNewsCloseBtn">Entrar en la app</button></div>' +
      '</div>';

    document.body.appendChild(overlay);
    var btn=document.getElementById("appNewsCloseBtn");
    if(btn) btn.addEventListener("click",closeNews);
    overlay.addEventListener("click",function(ev){ if(ev.target===overlay) closeNews(); });
    document.addEventListener("keydown",function(ev){ if(ev.key==="Escape") closeNews(); },{once:true});
    requestAnimationFrame(function(){ overlay.classList.add("is-visible"); overlay.setAttribute("aria-hidden","false"); });
  }

  ready(function(){
    setTimeout(buildNewsModal, 180);
  });
})();
