async function readJSONFile(filename) {
  try {
    const response = await fetch(`/read_json/${filename}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

async function writeJSONFile(filename, data) {
  try {
    const response = await fetch('/update_json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename, content: data }),
    });
    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error('Failed to update JSON file');
    }
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
  }
}

async function toggleBlockStatus(website, isCurrentlyBlocked) {
  try {
    const button = event.target;
    button.disabled = true;
    button.classList.add('loading');

    let detectedWebsites = await readJSONFile('detected.json');
    let blockedWebsites = await readJSONFile('blocked.json');

    if (isCurrentlyBlocked) {
      blockedWebsites = blockedWebsites.filter(site => site !== website);
    } else {
      detectedWebsites = detectedWebsites.filter(site => site !== website);
      if (!blockedWebsites.includes(website)) {
        blockedWebsites.push(website);
      }
    }

    await writeJSONFile('detected.json', detectedWebsites);
    await writeJSONFile('blocked.json', blockedWebsites);

    await updateLists();

    button.disabled = false;
    button.classList.remove('loading');
  } catch (error) {
    console.error('Error toggling block status:', error);
  }
}

async function updateLists() {
  try {
    const detectedList = document.getElementById('detected-list');
    const blockedList = document.getElementById('blocked-list');

    const detectedWebsites = await readJSONFile('detected.json');
    const blockedWebsites = await readJSONFile('blocked.json');

    updateListWithAnimation(detectedList, detectedWebsites, false);
    updateListWithAnimation(blockedList, blockedWebsites, true);
  } catch (error) {
    console.error('Error updating lists:', error);
  }
}

function updateListWithAnimation(listElement, websites, isBlocked) {
  const currentItems = Array.from(listElement.children);
  
  if (websites.length === 0 && !isBlocked) {
    listElement.innerHTML = '<li class="list-group-item"><span class="detected-text">None Detected</span></li>';
    return;
  }

  const newItems = websites.map(website => createListItem(website, isBlocked));

  currentItems.forEach(item => {
    if (!websites.includes(item.querySelector('span').textContent)) {
      item.classList.add('fade-out');
      setTimeout(() => item.remove(), 300);
    }
  });

  newItems.forEach(newItem => {
    if (!currentItems.some(item => item.querySelector('span').textContent === newItem.querySelector('span').textContent)) {
      newItem.classList.add('fade-in');
      listElement.appendChild(newItem);
      setTimeout(() => {
        newItem.classList.remove('fade-in');
        newItem.classList.add('fade-in-animation');
        scrollToBottom(listElement);
      }, 10);
    }
  });
}

function createListItem(website, isBlocked) {
  const li = document.createElement('li');
  li.className = 'list-group-item';
  
  const span = document.createElement('span');
  span.textContent = website;
  span.className = isBlocked ? 'blocked-text' : 'detected-text';
  li.appendChild(span);

  if (website !== 'None Detected') {
    const button = document.createElement('button');
    button.className = `btn btn-sm ${isBlocked ? 'btn-unblock' : 'btn-block'}`;
    button.textContent = isBlocked ? 'Unblock' : 'Block';
    button.onclick = () => toggleBlockStatus(website, isBlocked);
    li.appendChild(button);
  }

  return li;
}

async function initializeLists() {
  try {
    const cardBody = document.querySelector('.card-body');
    cardBody.style.opacity = '0';
    
    await updateLists();
    
    setTimeout(() => {
      cardBody.style.opacity = '1';
      cardBody.style.transition = 'opacity 0.5s ease-out';
    }, 100);
  } catch (error) {
    console.error('Error initializing lists:', error);
  }
}

function scrollToBottom(element) {
  element.scrollTop = element.scrollHeight;
}

async function exportBlockedSites() {
  try {
    const blockedWebsites = await readJSONFile('blocked.json');
    const blob = new Blob([JSON.stringify(blockedWebsites, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blocked_sites.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting blocked sites:', error);
  }
}

async function importBlockedSites(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedSites = JSON.parse(e.target.result);
        if (!Array.isArray(importedSites)) {
          throw new Error('Invalid format: imported data must be an array');
        }

        const currentBlockedSites = await readJSONFile('blocked.json');
        const updatedBlockedSites = [...new Set([...currentBlockedSites, ...importedSites])];

        await writeJSONFile('blocked.json', updatedBlockedSites);
        await updateLists();
        
        alert('Blocked sites imported successfully!');
      } catch (error) {
        console.error('Error parsing imported file:', error);
        alert('Error importing blocked sites. Please check the file format.');
      }
    };
    reader.readAsText(file);
  } catch (error) {
    console.error('Error importing blocked sites:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  const dashboardTitle = document.querySelector('h2.card-title');

  exportBtn.addEventListener('click', exportBlockedSites);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importBlockedSites);

  dashboardTitle.addEventListener('mouseover', () => {
    dashboardTitle.style.transform = 'scale(1.05)';
    dashboardTitle.style.transition = 'transform 0.3s ease';
  });
  dashboardTitle.addEventListener('mouseout', () => {
    dashboardTitle.style.transform = 'scale(1)';
  });

  initializeLists();
});