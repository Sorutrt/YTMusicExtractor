document.getElementById('extract-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('music.youtube.com')) {
    document.getElementById('status-msg').textContent = 'YouTube Musicのページで実行してください';
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractSongs
  }, (results) => {
    if (results && results[0].result) {
      const titles = results[0].result;
      if (titles.length === 0) {
        document.getElementById('status-msg').textContent = '曲が見つかりませんでした。ページをスクロールしてみてください。';
        return;
      }

      const formattedList = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
      const container = document.getElementById('result-container');
      container.textContent = formattedList;
      container.style.display = 'block';
      document.getElementById('copy-btn').style.display = 'block';
      document.getElementById('status-msg').textContent = `${titles.length}件抽出しました`;
    }
  });
});

document.getElementById('copy-btn').addEventListener('click', () => {
  const text = document.getElementById('result-container').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn');
    const originalText = btn.textContent;
    btn.textContent = 'コピー完了！';
    setTimeout(() => { btn.textContent = originalText; }, 2000);
  });
});

// この関数がYouTube Musicのページ内で実行される
function extractSongs() {
  const songRows = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
  const titles = [];

  songRows.forEach((row) => {
    // 曲名の要素を特定
    const titleEl = row.querySelector('.title-column yt-formatted-string');
    if (titleEl) {
      const titleText = titleEl.innerText.trim();
      if (titleText && titleText !== '曲名') {
        titles.push(titleText);
      }
    }
  });

  return titles;
}

