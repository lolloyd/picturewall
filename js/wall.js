/**
 * Wall Gallery Page Handler
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  const warningDiv = document.getElementById('no-event-wall-warning');
  const wallContent = document.getElementById('wall-content');
  const wallTitle = document.getElementById('wall-title');
  const wallSubtitle = document.getElementById('wall-subtitle');
  const btnSharePage = document.getElementById('btn-share-page');

  if (!eventId) {
    warningDiv.style.display = 'block';
    wallContent.style.display = 'none';
    wallTitle.textContent = 'Picture Wall';
    wallSubtitle.textContent = 'No event selected';
    return;
  }

  warningDiv.style.display = 'none';
  wallContent.style.display = 'block';

  if (btnSharePage) {
    btnSharePage.href = `share.html?eventId=${encodeURIComponent(eventId)}`;
  }

  // Fetch event details
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`);
    if (res.ok) {
      const event = await res.json();
      wallTitle.textContent = event.title ? `📺 ${event.title}` : `📺 Event: ${eventId}`;
      wallSubtitle.textContent = event.description || `Live picture wall gallery for ${eventId}`;
    } else {
      wallTitle.textContent = `📺 Event: ${eventId}`;
      wallSubtitle.textContent = 'Live picture wall gallery';
    }
  } catch (err) {
    console.error('Error fetching event details:', err);
    wallTitle.textContent = `📺 Event: ${eventId}`;
  }

  loadWallGallery(eventId);

  // Auto refresh gallery every 10 seconds to show new uploads dynamically
  setInterval(() => loadWallGallery(eventId), 10000);
});

async function loadWallGallery(eventId) {
  const gallery = document.getElementById('wall-gallery');
  if (!gallery) return;

  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/images`);
    const images = await res.json();

    if (!images || images.length === 0) {
      gallery.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; background: #1e1e1e; border-radius: 12px; border: 1px dashed #444;">
          <h3 style="color: #ccc; margin-bottom: 0.5rem;">No Photos on the Wall Yet</h3>
          <p style="color: #888; margin-bottom: 1.5rem;">Be the first to share a moment! Scan the QR code or click upload above.</p>
          <a href="share.html?eventId=${encodeURIComponent(eventId)}" class="btn btn-primary">Upload First Photo</a>
        </div>
      `;
      return;
    }

    gallery.innerHTML = '';
    images.forEach(img => {
      const item = document.createElement('div');
      item.className = 'gallery-item';

      const initial = (img.userEmail || 'U').charAt(0).toUpperCase();
      const dateStr = img.createdAt ? new Date(img.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      item.innerHTML = `
        <div class="gallery-img-wrapper">
          <a href="${img.url}" target="_blank" title="View Full Image">
            <img src="${img.url}" alt="Uploaded photo" loading="lazy">
          </a>
        </div>
        <div class="gallery-caption">
          <div class="uploader-info">
            <div class="uploader-badge">${initial}</div>
            <span class="uploader-email" title="${escapeHtml(img.userEmail)}">${escapeHtml(img.userEmail)}</span>
          </div>
          ${dateStr ? `<span class="upload-time">${dateStr}</span>` : ''}
        </div>
      `;

      gallery.appendChild(item);
    });
  } catch (err) {
    console.error('Error loading gallery images:', err);
  }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
