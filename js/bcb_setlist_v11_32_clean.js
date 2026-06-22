/* APP-BCB v7.1
   Archivo conservado solo para neutralizar cachés antiguas.
   Ya no fuerza 32 canciones ni pisa Google Sheet.
*/
window.BCB_SETLIST_V11_CLEAN_PATCH = {
  id: 'disabled-v7.1-estable',
  apply: function(){ return false; },
  countSongs: function(){ return (typeof db !== 'undefined' && db.repertoire) ? db.repertoire.length : 0; },
  countSetlist: function(){ return (typeof setlistRows === 'function') ? setlistRows().length : 0; }
};
console.info('[APP-BCB] Setlist force patch desactivado en v7.1.');
