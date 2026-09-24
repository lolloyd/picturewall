/**
 * Share Image Page Handler
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  const noEventWarning = document.getElementById('no-event-warning');
  const shareContainer = document.getElementById('share-container');
  const loginPrompt = document.getElementById('login-required-prompt');
  const uploadSection = document.getElementById('upload-section');
  const linkToWall = document.getElementById('link-to-wall');

  if (!eventId) {
    noEventWarning.style.display = 'block';
    shareContainer.style.display = 'none';
    return;
  }

  noEventWarning.style.display = 'none';
  shareContainer.style.display = 'block';

  if (linkToWall) {
    linkToWall.href = `wall.html?eventId=${encodeURIComponent(eventId)}`;
  }

  // Fetch event details
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`);
    if (res.ok) {
      const event = await res.json();
      document.getElementById('event-title-heading').textContent = event.title || `Event: ${eventId}`;
      document.getElementById('event-description-text').textContent = event.description || '';
    } else {
      document.getElementById('event-title-heading').textContent = `Event: ${eventId}`;
    }
  } catch (e) {
    console.error('Error fetching event info:', e);
  }

  function updateAuthUI() {
    const user = Auth.getUser();
    if (user) {
      loginPrompt.style.display = 'none';
      uploadSection.style.display = 'block';
    } else {
      loginPrompt.style.display = 'block';
      uploadSection.style.display = 'none';
    }
  }

  window.addEventListener('auth-change', updateAuthUI);
  updateAuthUI();

  // Preview Image
  const imageInput = document.getElementById('image-input');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview');

  if (imageInput) {
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.style.display = 'none';
      }
    });
  }

  // Handle Form Submission
  const uploadForm = document.getElementById('upload-form');
  const statusDiv = document.getElementById('upload-status');

  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = Auth.getUser();
      if (!user) {
        alert('You must be signed in to upload.');
        return;
      }

      const file = imageInput.files[0];
      if (!file) {
        alert('Please select an image file.');
        return;
      }

      const formData = new FormData();
      formData.append('eventId', eventId);
      formData.append('userEmail', user.email);
      formData.append('image', file);

      statusDiv.innerHTML = '<div class="alert alert-info">Uploading image...</div>';

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();

        if (res.ok) {
          statusDiv.innerHTML = `<div class="alert alert-success">Successfully uploaded image! Saved to <code>${escapeHtml(data.path)}</code></div>`;
          uploadForm.reset();
          previewContainer.style.display = 'none';
          loadEventImages(eventId);
        } else {
          statusDiv.innerHTML = `<div class="alert alert-danger">Upload failed: ${escapeHtml(data.error || 'Unknown error')}</div>`;
        }
      } catch (err) {
        console.error('Upload error:', err);
        statusDiv.innerHTML = '<div class="alert alert-danger">Failed to upload image.</div>';
      }
    });
  }

  loadEventImages(eventId);
});

async function loadEventImages(eventId) {
  const grid = document.getElementById('my-uploads-grid');
  if (!grid) return;

  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/images`);
    const images = await res.json();

    if (!images || images.length === 0) {
      grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">No uploaded images yet. Be the first to share one!</p>';
      return;
    }

    grid.innerHTML = '';
    images.forEach(img => {
      const card = document.createElement('div');
      card.style.background = '#fff';
      card.style.border = '1px solid var(--border-color)';
      card.style.borderRadius = 'var(--radius)';
      card.style.overflow = 'hidden';
      card.style.boxShadow = 'var(--shadow)';

      card.innerHTML = `
        <div style="width: 100%; height: 200px; background: #f0f0f0; overflow: hidden; display: flex; align-items: center; justify-content: center;">
          <img src="${img.url}" alt="${escapeHtml(img.filename)}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div style="padding: 0.75rem;">
          <p style="font-size: 0.85rem; font-weight: 600; color: var(--text-color); margin-bottom: 0.25rem;">Uploaded by:</p>
          <p style="font-size: 0.85rem; color: var(--primary-color); word-break: break-all;">${escapeHtml(img.userEmail)}</p>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Path: <code>${escapeHtml(img.path)}</code></p>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load images:', err);
    grid.innerHTML = '<p class="alert alert-danger" style="grid-column: 1/-1;">Failed to load images.</p>';
  }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
