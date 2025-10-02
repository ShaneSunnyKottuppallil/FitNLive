async function fetchProfile() {
  try {
    const res = await fetch('/api/profile/health', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch profile');
    const profile = await res.json();

    document.getElementById('age').value = profile.age || '';
    document.getElementById('gender').value = profile.gender || '';
    document.getElementById('height').value = profile.height || '';
    document.getElementById('weight').value = profile.weight || '';
    document.getElementById('dietaryPreferences').value = profile.dietaryPreferences || '';
    document.getElementById('allergies').value = (profile.allergies || []).join(', ');
    document.getElementById('goals').value = profile.goals || '';
  } catch (err) {
    const status = document.getElementById('statusMsg');
    status.textContent = err.message;
    status.className = 'err';
  }
}

document.getElementById('skipBtn').addEventListener('click', () => {
  window.location.href = '/chat';
});

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const statusEl = document.getElementById('statusMsg');
  statusEl.textContent = '';
  statusEl.className = '';

  const age = Number(document.getElementById('age').value);
  const gender = document.getElementById('gender').value;
  const height = Number(document.getElementById('height').value);
  const weight = Number(document.getElementById('weight').value);

  if (!age || !gender || !height || !weight) {
    statusEl.textContent = 'Please fill in all required fields.';
    statusEl.className = 'err';
    return;
  }

  const data = {
    age, gender, height, weight,
    dietaryPreferences: document.getElementById('dietaryPreferences').value.trim(),
    allergies: document.getElementById('allergies').value.split(',').map(a => a.trim()).filter(Boolean),
    goals: document.getElementById('goals').value.trim(),
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

  try {
    const res = await fetch('/api/profile/health', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (res.ok) {
      statusEl.textContent = 'Profile saved! Redirecting to your chats…';
      statusEl.className = 'ok';
      setTimeout(() => { window.location.href = '/chat'; }, 400);
    } else {
      throw new Error(result.error || 'Failed to save profile');
    }
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'err';
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Save Profile'; }
  }
});

fetchProfile();
