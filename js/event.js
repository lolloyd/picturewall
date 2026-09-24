/**
 * Event Management Page Handler
 */

document.addEventListener('DOMContentLoaded', async () => {
  const unauthorizedMsg = document.getElementById('unauthorized-message');
  const adminContent = document.getElementById('admin-content');
  const accessDeniedReason = document.getElementById('access-denied-reason');

  let adminEmail = 'lloyd.miguel@gmail.com';

  try {
    const configRes = await fetch('/api/config');
    const config = await configRes.json();
    if (config.adminEmail) {
      adminEmail = config.adminEmail;
    }
  } catch (e) {
    console.error('Error fetching config:', e);
  }

  function checkAccess() {
    const user = Auth.getUser();
    if (user && Auth.isAdmin(adminEmail)) {
      unauthorizedMsg.style.display = 'none';
      adminContent.style.display = 'block';
      loadEvents();
    } else {
      adminContent.style.display = 'none';
      unauthorizedMsg.style.display = 'block';
      if (!user) {
        accessDeniedReason.textContent = 'You must be signed in to access Event Management.';
      } else {
        accessDeniedReason.textContent = `User ${user.email} is not authorized. Access is restricted to ${adminEmail}.`;
      }
    }
  }

  const createForm = document.getElementById('create-event-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = Auth.getUser();
      if (!user) {
        alert('Please sign in first.');
        return;
      }

      const titleInput = document.getElementById('event-title');
      const idInput = document.getElementById('event-id');
      const descInput = document.getElementById('event-desc');

      const title = titleInput.value.trim();
      const id = idInput.value.trim();
      const description = descInput.value.trim();

      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            id: id || undefined,
            description,
            userEmail: user.email
          })
        });

        const data = await res.json();
        if (res.ok) {
          titleInput.value = '';
          idInput.value = '';
          descInput.value = '';
          loadEvents();
        } else {
          alert('Error creating event: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error submitting event:', err);
        alert('Failed to create event.');
      }
    });
  }

  window.addEventListener('auth-change', checkAccess);
  checkAccess();
});

async function loadEvents() {
  const container = document.getElementById('events-list-container');
  if (!container) return;

  try {
    const res = await fetch('/api/events');
    const events = await res.json();

    if (!events || events.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">No events created yet. Use the form above to create one.</p>';
      return;
    }

    container.innerHTML = '';
    events.forEach(event => {
      const shareUrl = `${window.location.origin}/share.html?eventId=${encodeURIComponent(event.id)}`;
      const wallUrl = `${window.location.origin}/wall.html?eventId=${encodeURIComponent(event.id)}`;

      const card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '0';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justify = 'space-between';

      const qrcodeCanvasId = `qr-${event.id.replace(/[^a-zA-Z0-9]/g, '-')}`;

      card.innerHTML = `
        <div>
          <h3 style="margin-bottom: 0.5rem;">${escapeHtml(event.title)}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">ID: <code>${escapeHtml(event.id)}</code></p>
          <p style="font-size: 0.95rem; margin-bottom: 1rem;">${escapeHtml(event.description || 'No description')}</p>
        </div>

        <div style="text-align: center; background: #f8f9fa; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
          <p style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted);">QR Code to Share Page</p>
          <canvas id="${qrcodeCanvasId}" style="max-width: 160px; max-height: 160px; margin: 0 auto;"></canvas>
          <br>
          <a href="${shareUrl}" target="_blank" style="font-size: 0.8rem; word-break: break-all; color: var(--primary-color);">${shareUrl}</a>
        </div>

        <div style="display: flex; gap: 0.5rem;">
          <a href="${shareUrl}" class="btn btn-primary btn-sm" style="flex: 1;" target="_blank">Upload / Share</a>
          <a href="${wallUrl}" class="btn btn-secondary btn-sm" style="flex: 1;" target="_blank">View Wall</a>
        </div>
      `;

      container.appendChild(card);

      // Render QR Code
      setTimeout(() => {
        const canvas = document.getElementById(qrcodeCanvasId);
        if (canvas) {
          if (window.QRCode) {
            window.QRCode.toCanvas(canvas, shareUrl, { width: 160 }, (err) => {
              if (err) console.error('QR code generation error:', err);
            });
          } else {
            // Fallback if QRCode CDN not loaded
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#eee';
            ctx.fillRect(0,0,160,160);
            ctx.fillStyle = '#333';
            ctx.font = '12px sans-serif';
            ctx.fillText('QR Code Placeholder', 15, 80);
          }
        }
      }, 50);
    });
  } catch (e) {
    console.error('Failed to load events:', e);
    container.innerHTML = '<p class="alert alert-danger" style="grid-column: 1/-1;">Failed to load events.</p>';
  }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
