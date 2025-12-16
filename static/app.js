// static/app.js
(function(){
  // Replaced by server: integer milliseconds (e.g. 1500)
  const REFRESH_MS = 2000;

  let tables = [], selected = null, polling = true, pollId = null;
  const el = id => document.getElementById(id);
  const setStatus = s => { const sEl = el('status'); if(sEl) sEl.textContent = 'Status: ' + s; };

  async function fetchTables(){
    el('tablesList').textContent = 'Loading…';
    try{
      const r = await fetch('/api/tables');
      const j = await r.json();
      tables = j.tables || [];
      renderTables();
      setStatus('tables loaded');
      // auto-select first table if nothing selected
      if(!selected && tables.length) {
        selectTable(tables[0]);
      }
    }catch(e){
      el('tablesList').textContent = 'Error fetching tables: ' + e;
      setStatus('error');
      console.error('fetchTables error', e);
    }
  }

  function renderTables(){
    const container = document.createElement('div');
    if(tables.length === 0){
      container.textContent = 'No tables found';
      el('tablesList').innerHTML = '';
      el('tablesList').appendChild(container);
      return;
    }
    tables.forEach(t => {
      const b = document.createElement('button');
      b.textContent = t; b.className = 'table-button';
      b.onclick = ()=> selectTable(t);
      if(t === selected) b.classList.add('active');
      container.appendChild(b);
    });
    el('tablesList').innerHTML = ''; el('tablesList').appendChild(container);
  }

  // Fetch rows for the currently selected table
  async function fetchRows(){
    if(!selected) return;
    // show a quick local timestamp so you can see polling activity
    const now = new Date().toLocaleTimeString();
    setStatus(`polling @ ${now}`);
    const limit = el('limit').value || 200;
    const q = encodeURIComponent(el('query').value || '');
    try{
      const r = await fetch(`/api/rows/${encodeURIComponent(selected)}?limit=${limit}${q?('&q='+q):''}`);
      const j = await r.json();
      if (j.rows) {
        renderRows(j.rows || []);
      } else {
        console.warn('Unexpected rows payload', j);
      }
      // update status with success timestamp
      setStatus(`last update ${new Date().toLocaleTimeString()}`);
    }catch(e){
      // keep polling even on error
      setStatus('poll error — retrying');
      console.error('fetchRows error', e);
    }
  }

  function renderRows(rows){
    const tbody = el('rowsBody'); tbody.innerHTML = '';
    if(rows.length === 0){
      tbody.innerHTML = '<tr><td colspan="3" class="muted">No rows</td></tr>';
      return;
    }
    rows.forEach(r => {
      const tr = document.createElement('tr'); tr.className = 'row';
      const td1 = document.createElement('td'); td1.textContent = r.id;
      const td2 = document.createElement('td'); const pre = document.createElement('pre'); pre.className='content'; pre.textContent = r.content || ''; td2.appendChild(pre);
      const td3 = document.createElement('td'); td3.textContent = r.created_at || '';
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
      tbody.appendChild(tr);
    });
  }

  // When a new table is selected, update UI and fetch rows immediately
  function selectTable(t){
    selected = t;
    const title = el('selectedTitle'); if(title) title.textContent = 'Table: ' + t;
    renderTables();
    // Immediately fetch rows for the selected table
    fetchRows();
    // Ensure polling is running
    if(polling) startPolling();
  }

  function startPolling(){
    // If already polling, clear and re-start to avoid duplicates
    if(pollId) clearInterval(pollId);
    pollId = setInterval(()=>{ 
      // Only fetch rows if a table is selected
      if(selected) fetchRows();
    }, REFRESH_MS);
    console.debug('polling started, interval ms =', REFRESH_MS);
  }

  function stopPolling(){
    if(pollId) clearInterval(pollId);
    pollId = null;
    console.debug('polling stopped');
  }

  // wire buttons
  document.addEventListener('click', e => {
    if(e.target && e.target.id === 'refreshTables') fetchTables();
    if(e.target && e.target.id === 'refreshRows') fetchRows();
    if(e.target && e.target.id === 'togglePolling'){
      polling = !polling; e.target.textContent = polling ? 'Pause' : 'Resume';
      if(polling) startPolling(); else stopPolling();
    }
  });

  // initial load: fetch tables first, select first table automatically, start polling
  fetchTables().then(()=>{ 
    if(tables.length && !selected) selectTable(tables[0]); 
  }).catch(console.error);
  startPolling();

})();
