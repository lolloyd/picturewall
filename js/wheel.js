/**
 * Wheel of Names Page Handler & Wheel Generator Logic
 */

// Helper function to build entries per email with random non-duplicate images per entry
function generateWheelEntries(imagesGroupedByEmail, maxEntriesPerEmail = 10) {
  const wheelEntries = [];
  const emails = Object.keys(imagesGroupedByEmail);

  // Distinct colors palette
  const colors = [
    '#4285f4', '#ea4335', '#fbbc05', '#34a853',
    '#ff6d01', '#46bdc6', '#7baaf7', '#f07b72',
    '#fcd04d', '#71c287', '#ab47bc', '#ec407a'
  ];

  let colorIdx = 0;

  emails.forEach(email => {
    const userImages = [...imagesGroupedByEmail[email]];
    if (userImages.length === 0) return;

    // Number of entries for this user based on uploads and max setting
    const numEntries = Math.min(userImages.length, Math.max(1, maxEntriesPerEmail));

    // Shuffle user images to pick random non-duplicate pictures for entries
    const shuffledImages = [...userImages];
    for (let i = shuffledImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
    }

    // Assign distinct random pictures to entries
    for (let k = 0; k < numEntries; k++) {
      // Pick image without duplication (if k < shuffledImages.length)
      const selectedImage = shuffledImages[k % shuffledImages.length];

      wheelEntries.push({
        email: email,
        image: selectedImage,
        entryIndex: k + 1,
        totalUserEntries: numEntries,
        color: colors[colorIdx % colors.length]
      });
      colorIdx++;
    }
  });

  return wheelEntries;
}

// Attach generator function to window for testing/global access
if (typeof window !== 'undefined') {
  window.generateWheelEntries = generateWheelEntries;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateWheelEntries };
}

if (typeof document !== 'undefined') {
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');

  const warningDiv = document.getElementById('no-event-wheel-warning');
  const mainContent = document.getElementById('wheel-main-content');
  const eventTitleDisplay = document.getElementById('event-title-display');
  const eventSubtitleDisplay = document.getElementById('event-subtitle-display');
  const btnViewWall = document.getElementById('btn-view-wall');

  if (!eventId) {
    if (warningDiv) warningDiv.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
    return;
  }

  if (warningDiv) warningDiv.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';

  if (btnViewWall) {
    btnViewWall.href = `wall.html?eventId=${encodeURIComponent(eventId)}`;
  }

  // Fetch Event Details
  try {
    const res = await fetch(`/api/events/${encodeURIComponent(eventId)}`);
    if (res.ok) {
      const event = await res.json();
      if (eventTitleDisplay) eventTitleDisplay.textContent = `🎡 Wheel of Names: ${event.title || eventId}`;
      if (eventSubtitleDisplay) eventSubtitleDisplay.textContent = event.description || `Wheel of Names for ${eventId}`;
    }
  } catch (err) {
    console.error('Error fetching event details:', err);
  }

  // State Variables
  let allEventImages = [];
  let imagesGroupedByEmail = {};
  let wheelEntries = [];
  let loadedImageElements = {}; // url -> HTMLImageElement
  let currentRotation = 0;
  let isSpinning = false;

  const canvas = document.getElementById('wheel-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const spinBtn = document.getElementById('btn-spin-center');
  const statusMsg = document.getElementById('wheel-status');
  const maxEntriesInput = document.getElementById('max-entries-input');
  const applyConfigBtn = document.getElementById('btn-apply-config');
  const tableBody = document.getElementById('entries-table-body');

  const winnerModal = document.getElementById('winner-modal');
  const winnerEmailDisplay = document.getElementById('winner-email-display');
  const winnerImgDisplay = document.getElementById('winner-image-display');
  const closeWinnerModalBtn = document.getElementById('btn-close-winner-modal');

  // Load Event Images
  async function loadImagesAndBuildWheel() {
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/images`);
      allEventImages = await res.json();

      // Group images by email
      imagesGroupedByEmail = {};
      allEventImages.forEach(img => {
        const email = (img.userEmail || 'anonymous').toLowerCase();
        if (!imagesGroupedByEmail[email]) {
          imagesGroupedByEmail[email] = [];
        }
        imagesGroupedByEmail[email].push(img);
      });

      // Preload image elements for rendering in canvas
      allEventImages.forEach(img => {
        if (!loadedImageElements[img.url]) {
          const imgEl = new Image();
          imgEl.src = img.url;
          imgEl.onload = () => drawWheel();
          loadedImageElements[img.url] = imgEl;
        }
      });

      rebuildWheel();
    } catch (err) {
      console.error('Error loading event images for wheel:', err);
      if (statusMsg) statusMsg.textContent = 'Failed to load event images.';
    }
  }

  function rebuildWheel() {
    const maxVal = parseInt(maxEntriesInput ? maxEntriesInput.value : 10, 10) || 10;
    wheelEntries = generateWheelEntries(imagesGroupedByEmail, maxVal);

    updateParticipantsTable();
    drawWheel();

    if (wheelEntries.length === 0) {
      if (spinBtn) spinBtn.disabled = true;
      if (statusMsg) statusMsg.textContent = 'No photo uploaders found for this event.';
    } else {
      if (spinBtn) spinBtn.disabled = false;
      if (statusMsg) statusMsg.textContent = `${wheelEntries.length} entries ready on wheel. Click SPIN!`;
    }
  }

  function updateParticipantsTable() {
    if (!tableBody) return;

    const emails = Object.keys(imagesGroupedByEmail);
    if (emails.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No photos uploaded yet.</td></tr>';
      return;
    }

    const maxVal = parseInt(maxEntriesInput ? maxEntriesInput.value : 10, 10) || 10;

    tableBody.innerHTML = '';
    emails.forEach(email => {
      const totalPhotos = imagesGroupedByEmail[email].length;
      const calculatedEntries = Math.min(totalPhotos, Math.max(1, maxVal));

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(email)}</strong></td>
        <td style="text-align: center;">${totalPhotos}</td>
        <td style="text-align: center;"><span class="badge" style="background:#e8f0fe; color:#1a73e8; padding:2px 8px; border-radius:12px; font-weight:600;">${calculatedEntries}</span></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function drawWheel() {
    if (!ctx || !canvas) return;

    const numSlices = wheelEntries.length;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 5;

    ctx.clearRect(0, 0, width, height);

    if (numSlices === 0) {
      // Empty wheel placeholder
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#f1f3f4';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#dadce0';
      ctx.stroke();

      ctx.fillStyle = '#5f6368';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No Entries Available', centerX, centerY);
      return;
    }

    const sliceAngle = (2 * Math.PI) / numSlices;

    for (let i = 0; i < numSlices; i++) {
      const entry = wheelEntries[i];
      const startAngle = currentRotation + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      // Draw Sector Fill
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = entry.color;
      ctx.fill();

      // Sector Border
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Draw Content inside Sector (Text and Thumbnail)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);

      // Position text along slice vector
      const textRadius = radius * 0.65;
      const imgRadius = radius * 0.38;

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = numSlices > 20 ? 'bold 11px sans-serif' : 'bold 13px sans-serif';

      // Truncate email if long
      let displayEmail = entry.email;
      if (displayEmail.length > 18) {
        displayEmail = displayEmail.substring(0, 16) + '...';
      }
      ctx.fillText(displayEmail, radius * 0.9, 0);

      // Draw thumbnail image if preloaded
      const imgObj = loadedImageElements[entry.image.url];
      if (imgObj && imgObj.complete && imgObj.naturalWidth !== 0) {
        const size = numSlices > 16 ? 28 : 36;
        ctx.save();
        ctx.beginPath();
        ctx.arc(imgRadius, 0, size / 2, 0, 2 * Math.PI);
        ctx.clip();

        // Draw image keeping ratio
        ctx.drawImage(imgObj, imgRadius - size / 2, -size / 2, size, size);
        ctx.restore();

        // Thumbnail border circle
        ctx.beginPath();
        ctx.arc(imgRadius, 0, size / 2, 0, 2 * Math.PI);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      ctx.restore();
    }

    // Outer boundary ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  function spinWheel() {
    if (isSpinning || wheelEntries.length === 0) return;

    isSpinning = true;
    if (spinBtn) spinBtn.disabled = true;
    if (statusMsg) statusMsg.textContent = 'Spinning... Good luck!';

    const numSlices = wheelEntries.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    // Pick random target slice index
    const winningIndex = Math.floor(Math.random() * numSlices);

    // Calculate rotation to align top pointer (at 12 o'clock = 3pi/2 in canvas angle) with winning slice center
    // Winning slice angle center offset from start: winningIndex * sliceAngle + sliceAngle / 2
    // Target rotation: 3pi/2 - (winningIndex * sliceAngle + sliceAngle / 2)
    const targetAngleOffset = (3 * Math.PI / 2) - (winningIndex * sliceAngle + sliceAngle / 2);

    // Total turns (5 to 8 full spins)
    const extraTurns = (5 + Math.floor(Math.random() * 4)) * 2 * Math.PI;

    // Normalize current rotation
    const currentNorm = currentRotation % (2 * Math.PI);
    const finalRotation = currentRotation + extraTurns + ((targetAngleOffset - currentNorm + 4 * Math.PI) % (2 * Math.PI));

    const startTime = performance.now();
    const duration = 5000; // 5 seconds

    function animateSpin(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease Out Cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);

      currentRotation = currentRotation + (finalRotation - currentRotation) * (easeOut - (progress > 0 ? 1 - Math.pow(1 - (progress - 0.016), 3) : 0));

      // Direct calculation for frame
      const interpolatedRotation = currentRotation + (finalRotation - currentRotation) * easeOut;
      currentRotation = interpolatedRotation;

      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        currentRotation = finalRotation;
        drawWheel();
        isSpinning = false;
        if (spinBtn) spinBtn.disabled = false;

        const winner = wheelEntries[winningIndex];
        showWinner(winner);
      }
    }

    requestAnimationFrame(animateSpin);
  }

  function showWinner(winner) {
    if (!winner) return;

    if (statusMsg) statusMsg.textContent = `🎉 Winner: ${winner.email}!`;

    if (winnerEmailDisplay) winnerEmailDisplay.textContent = winner.email;
    if (winnerImgDisplay) {
      winnerImgDisplay.src = winner.image.url;
    }

    if (winnerModal) winnerModal.classList.add('active');
  }

  // Event Listeners
  if (spinBtn) {
    spinBtn.addEventListener('click', spinWheel);
  }

  if (applyConfigBtn) {
    applyConfigBtn.addEventListener('click', rebuildWheel);
  }

  if (closeWinnerModalBtn) {
    closeWinnerModalBtn.addEventListener('click', () => {
      if (winnerModal) winnerModal.classList.remove('active');
    });
  }

  // Load initial data
  loadImagesAndBuildWheel();
});
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
