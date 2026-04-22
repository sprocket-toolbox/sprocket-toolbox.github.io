// sprocket.js
document.addEventListener('DOMContentLoaded', function () {
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

  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(function (cb) {
    const key = checkboxKey(cb);
    if (state[key]) cb.checked = true;
    cb.addEventListener('change', function () {
      if (cb.checked) state[key] = true;
      else delete state[key];
      saveState();
    });
  });

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
});
