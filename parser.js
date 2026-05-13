// parser.js — minimal markdown→HTML for Sprocket Toolbox.
//
// Supports the exact subset our .md files use:
//   >>> Title ... <<<   collapsibles (nestable)
//   #..######           headings
//   ---                 horizontal rule
//   | a | b | tables    (header row + |---|---| separator + body)
//   [ ] / [x]           checkboxes (rendered inline, indent preserved)
//   **bold**, *italic*, [text](url)
//   leading spaces      → <p style="margin-left:Nch">
//
// Triggered by <script data-brewdown="path.md"></script> tags.

(function () {
  'use strict';

  // ---------------------------------------------------------------- utilities

  function escapeHTML(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Inline formatting applied to one logical line of content.
  // Checkboxes first (specific pattern), then bold (greedy) before italic
  // so '*' inside '**' isn't grabbed by italic. Links last.
  function inline(text) {
    text = escapeHTML(text);
    text = text.replace(/\[x\]/gi, '<input type="checkbox" checked>');
    text = text.replace(/\[ \]/g, '<input type="checkbox">');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return text;
  }

  // ------------------------------------------------------------- table parser

  function splitRow(line) {
    return line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  }

  function renderTable(rows) {
    if (rows.length < 2) return '';
    const headers = splitRow(rows[0]);
    let html = '<div class="table-wrap"><table><thead><tr>';
    for (const h of headers) html += `<th>${inline(h)}</th>`;
    html += '</tr></thead><tbody>';
    // rows[1] is the |---|---| separator; skip it
    for (let i = 2; i < rows.length; i++) {
      const cells = splitRow(rows[i]);
      html += '<tr>';
      for (const c of cells) html += `<td>${inline(c)}</td>`;
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  // ---------------------------------------------------------- block-level run

  function parse(md) {
    const lines = md.split(/\r?\n/);
    let html = '';
    let tableRows = [];
    let openDetails = 0;

    function flushTable() {
      if (tableRows.length) {
        html += renderTable(tableRows);
        tableRows = [];
      }
    }

    for (const raw of lines) {
      const trimmed = raw.trim();

      // Consume consecutive | lines as a table
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        tableRows.push(trimmed);
        continue;
      }
      flushTable();

      if (trimmed === '') continue;

      if (trimmed.startsWith('>>>')) {
        const title = trimmed.slice(3).trim();
        html += `<details><summary>${inline(title)}</summary>`;
        openDetails++;
        continue;
      }

      if (trimmed === '<<<') {
        if (openDetails > 0) {
          html += '</details>';
          openDetails--;
        }
        continue;
      }

      if (trimmed === '---') {
        html += '<hr>';
        continue;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        html += `<h${level}>${inline(heading[2])}</h${level}>`;
        continue;
      }

      // Default: paragraph, preserving leading-space indent as margin-left
      const indent = raw.length - raw.trimStart().length;
      const body = inline(raw.trimStart());
      if (indent > 0) {
        html += `<p style="margin-left:${indent}ch">${body}</p>`;
      } else {
        html += `<p>${body}</p>`;
      }
    }

    flushTable();
    while (openDetails > 0) {
      html += '</details>';
      openDetails--;
    }
    return html;
  }

  // ----------------------------------------------------------- script loader

  async function loadScript(script) {
    const src = script.getAttribute('data-brewdown');
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const text = await res.text();
      const tmp = document.createElement('div');
      tmp.innerHTML = parse(text);
      const frag = document.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      script.parentNode.insertBefore(frag, script);
      script.remove();
    } catch (err) {
      console.error('parser.js failed to load', src, err);
      const e = document.createElement('div');
      e.className = 'parser-error';
      e.textContent = `Failed to load ${src}: ${err.message}`;
      script.parentNode.insertBefore(e, script);
      script.remove();
    }
  }

  function init() {
    const scripts = document.querySelectorAll('script[data-brewdown]');
    // Fire all loads in parallel; each script inserts at its own DOM position
    // so display order matches script-tag order regardless of resolve order.
    scripts.forEach(loadScript);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
