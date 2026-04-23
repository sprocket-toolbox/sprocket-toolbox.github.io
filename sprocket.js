// sprocket.js
(function () {
  const STORAGE_KEY = 'sprocket-checklist';

  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (e) {
    state = {};
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function checkboxKey(checkbox) {
    const details = checkbox.closest('details');
    const dropdown = details ? details.querySelector('summary').textContent.trim() : '';

    let heading = '';
    let el = checkbox.closest('li') || checkbox;
    let current = el.parentElement;
    while (current) {
      let prev = current.previousElementSibling;
      while (prev) {
        if (prev.tagName && /^H[1-6]$/.test(prev.tagName)) {
          heading = prev.textContent.trim();
          break;
        }
        prev = prev.previousElementSibling;
      }
      if (heading) break;
      current = current.parentElement;
    }

    const label = (checkbox.parentElement.textContent || '').trim();
    return dropdown + '|' + heading + '|' + label;
  }

  const bound = new WeakSet();

  function hookCheckboxes(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const checkboxes = scope.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(function (cb) {
      if (bound.has(cb)) return;
      bound.add(cb);
      const key = checkboxKey(cb);
      if (state[key]) cb.checked = true;
      cb.addEventListener('change', function () {
        const k = checkboxKey(cb);
        if (cb.checked) state[k] = true;
        else delete state[k];
        saveState();
      });
    });
  }

  function init() {
    hookCheckboxes(document);

    const main = document.querySelector('main') || document.body;
    const observer = new MutationObserver(function (mutations) {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) hookCheckboxes(node);
        }
      }
    });
    observer.observe(main, { childList: true, subtree: true });

    const clearBtn = document.getElementById('clear-all');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        localStorage.removeItem(STORAGE_KEY);
        state = {};
        document.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
          cb.checked = false;
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
