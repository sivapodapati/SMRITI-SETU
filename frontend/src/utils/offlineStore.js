const BACKEND_URL = "http://127.0.0.1:8000";

// Scoped to current patient to maintain privacy
const getPatientKey = (patientId, subkey) => {
  return `patient_${patientId || "guest"}_${subkey}`;
};

export const offlineStore = {
  // Cache and Retrieve
  save: (patientId, key, data) => {
    try {
      localStorage.setItem(getPatientKey(patientId, key), JSON.stringify(data));
    } catch (e) {
      console.error("Cache save error:", e);
    }
  },

  get: (patientId, key) => {
    try {
      const val = localStorage.getItem(getPatientKey(patientId, key));
      return val ? JSON.parse(val) : null;
    } catch (e) {
      console.error("Cache get error:", e);
      return null;
    }
  },

  clearSession: (patientId) => {
    // Clear cached items for this patient upon logout
    try {
      const prefix = `patient_${patientId}_`;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error("Clear session cache error:", e);
    }
  },

  clearAllPatientSessions: () => {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("patient_") || k.startsWith("smritisetu_"))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error("Clear all sessions error:", e);
    }
  },

  // Synchronization Queues
  getQueue: (patientId, queueName) => {
    try {
      const q = localStorage.getItem(getPatientKey(patientId, queueName));
      return q ? JSON.parse(q) : [];
    } catch (e) {
      return [];
    }
  },

  saveQueue: (patientId, queueName, queueData) => {
    try {
      localStorage.setItem(getPatientKey(patientId, queueName), JSON.stringify(queueData));
    } catch (e) {}
  },

  queuePerformance: (patientId, record) => {
    const q = offlineStore.getQueue(patientId, "performance_queue");
    // Prevent duplicate queuing of same timestamped run
    if (!q.some(item => item.timestamp === record.timestamp)) {
      q.push({ ...record, syncStatus: "PENDING" });
      offlineStore.saveQueue(patientId, "performance_queue", q);
    }
  },

  queueTaskUpdate: (patientId, taskId, status) => {
    const q = offlineStore.getQueue(patientId, "task_queue");
    // Replace duplicate task changes with latest state
    const filtered = q.filter(item => item.taskId !== taskId);
    filtered.push({ taskId, status, timestamp: Date.now(), syncStatus: "PENDING" });
    offlineStore.saveQueue(patientId, "task_queue", filtered);
  },

  queueReminderUpdate: (patientId, reminderId, completed) => {
    const q = offlineStore.getQueue(patientId, "reminder_queue");
    // Replace duplicate reminder changes with latest state
    const filtered = q.filter(item => item.reminderId !== reminderId);
    filtered.push({ reminderId, completed, timestamp: Date.now(), syncStatus: "PENDING" });
    offlineStore.saveQueue(patientId, "reminder_queue", filtered);
  },

  getQueueCount: (patientId) => {
    const pq = offlineStore.getQueue(patientId, "performance_queue");
    const tq = offlineStore.getQueue(patientId, "task_queue");
    const rq = offlineStore.getQueue(patientId, "reminder_queue");
    return pq.length + tq.length + rq.length;
  },

  // Perform Synchronization
  sync: async (patientId, onProgress) => {
    if (!navigator.onLine) return { synced: 0, failed: 0 };

    let syncedCount = 0;
    let failedCount = 0;

    // 1. Sync Performance Logs
    const perfQ = offlineStore.getQueue(patientId, "performance_queue");
    const remainingPerf = [];
    for (const item of perfQ) {
      try {
        const res = await fetch(`${BACKEND_URL}/performance/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: item.patient_id,
            game_id: item.game_id,
            score: item.score,
            response_time: item.response_time,
            attempts: item.attempts,
            correct_answers: item.correct_answers,
            difficulty: item.difficulty,
            engagement_score: item.engagement_score,
            hints_used: item.hints_used,
            cognitive_support_level: item.cognitive_support_level,
            previous_difficulty: item.previous_difficulty,
            predicted_difficulty: item.predicted_difficulty,
            status: item.status,
            content_id: item.content_id,
            language: item.language,
            region: item.region
          })
        });
        if (res.ok) {
          syncedCount++;
        } else {
          remainingPerf.push({ ...item, syncStatus: "FAILED" });
          failedCount++;
        }
      } catch (err) {
        remainingPerf.push({ ...item, syncStatus: "FAILED" });
        failedCount++;
      }
    }
    offlineStore.saveQueue(patientId, "performance_queue", remainingPerf);

    // 2. Sync Tasks
    const taskQ = offlineStore.getQueue(patientId, "task_queue");
    const remainingTasks = [];
    for (const item of taskQ) {
      try {
        const res = await fetch(`${BACKEND_URL}/tasks/${item.taskId}/status?status=${item.status}`, {
          method: "PUT"
        });
        if (res.ok) {
          syncedCount++;
        } else {
          remainingTasks.push({ ...item, syncStatus: "FAILED" });
          failedCount++;
        }
      } catch (err) {
        remainingTasks.push({ ...item, syncStatus: "FAILED" });
        failedCount++;
      }
    }
    offlineStore.saveQueue(patientId, "task_queue", remainingTasks);

    // 3. Sync Reminders
    const remQ = offlineStore.getQueue(patientId, "reminder_queue");
    const remainingReminders = [];
    for (const item of remQ) {
      try {
        const res = await fetch(`${BACKEND_URL}/reminders/${item.reminderId}/complete?completed=${item.completed}`, {
          method: "PUT"
        });
        if (res.ok) {
          syncedCount++;
        } else {
          remainingReminders.push({ ...item, syncStatus: "FAILED" });
          failedCount++;
        }
      } catch (err) {
        remainingReminders.push({ ...item, syncStatus: "FAILED" });
        failedCount++;
      }
    }
    offlineStore.saveQueue(patientId, "reminder_queue", remainingReminders);

    if (onProgress) {
      onProgress(syncedCount, failedCount);
    }

    return { synced: syncedCount, failed: failedCount };
  }
};
