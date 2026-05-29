import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Interceptor: injeta Bearer token automaticamente
api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: renova token expirado automaticamente
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refresh = Cookies.get("refresh_token");
      if (!refresh) {
        // Sem refresh token → logout
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        window.location.href = "/auth/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
          refresh_token: refresh,
        });

        Cookies.set("access_token", data.access_token, { expires: 1 });
        Cookies.set("refresh_token", data.refresh_token, { expires: 30 });

        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        window.location.href = "/auth/login";
      }
    }

    return Promise.reject(error);
  }
);

// ─── Endpoints tipados ─────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", new URLSearchParams({ username: email, password }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  register: (data: { email: string; password: string; full_name: string; phone?: string }) =>
    api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
};

export const userApi = {
  me: () => api.get("/users/me"),
  update: (data: Record<string, unknown>) => api.put("/users/me", data),
  changePassword: (current: string, next: string) =>
    api.post("/users/me/change-password", { current_password: current, new_password: next }),
};

export const lessonsApi = {
  myLessons: (params?: Record<string, unknown>) => api.get("/lessons/my", { params }),
  nextLesson: () => api.get("/lessons/my/next"),
  confirm: (id: number) => api.post(`/lessons/my/${id}/confirm`),
  feedback: (id: number, rating: number, feedback?: string) =>
    api.post(`/lessons/my/${id}/feedback`, { rating, feedback }),
};

export const materialsApi = {
  list: (params?: Record<string, unknown>) => api.get("/materials", { params }),
  get: (id: number) => api.get(`/materials/${id}`),
  download: (id: number) => api.get(`/materials/${id}/download`),
};

export const exercisesApi = {
  list: (params?: Record<string, unknown>) => api.get("/exercises", { params }),
  get: (id: number) => api.get(`/exercises/${id}`),
  submit: (id: number, answer: Record<string, unknown>) =>
    api.post(`/exercises/${id}/submit`, { answer }),
  mySubmissions: () => api.get("/exercises/my/submissions"),
};

export const progressApi = {
  me: () => api.get("/progress/me"),
  badges: () => api.get("/progress/me/badges"),
  ranking: () => api.get("/progress/me/ranking"),
  notifications: (unreadOnly?: boolean) =>
    api.get("/progress/me/notifications", { params: { unread_only: unreadOnly } }),
  markRead: (id: number) => api.post(`/progress/me/notifications/${id}/read`),
  markAllRead: () => api.post("/progress/me/notifications/read-all"),
  placementTest: (answers: Array<{ question_id: number; selected: string }>) =>
    api.post("/progress/me/placement-test", { answers }),
};

export const iaApi = {
  chat: (message: string, history: Array<{ role: string; content: string }>) =>
    api.post("/ia/chat", { message, conversation_history: history }),
  correctEssay: (text: string, level: string) =>
    api.post("/ia/correct-essay", { text, level }),
  generateExercises: (topic: string, level: string, type: string, qty: number) =>
    api.post("/ia/generate-exercises", {
      topic, level, exercise_type: type, quantity: qty,
    }),
  conversationSimulator: (
    message: string,
    history: Array<{ role: string; content: string }>,
    scenario: string,
    level: string
  ) => api.post("/ia/conversation-simulator", {
    message, conversation_history: history, scenario, level,
  }),
};

export const paymentsApi = {
  myHistory: () => api.get("/payments/my"),
};

export const adminApi = {
  dashboard: () => api.get("/admin/dashboard"),
  students: (params?: Record<string, unknown>) => api.get("/users", { params }),
  getStudent: (id: number) => api.get(`/users/${id}`),
  blockStudent: (id: number, reason: string) =>
    api.patch(`/users/${id}/block`, null, { params: { reason } }),
  unblockStudent: (id: number) => api.patch(`/users/${id}/unblock`),
  createLesson: (data: Record<string, unknown>) => api.post("/lessons", data),
  allLessons: (params?: Record<string, unknown>) => api.get("/lessons", { params }),
  updateLesson: (id: number, data: Record<string, unknown>) => api.put(`/lessons/${id}`, data),
  cancelLesson: (id: number) => api.patch(`/lessons/${id}/cancel`),
  createMaterial: (data: Record<string, unknown>) => api.post("/materials", data),
  updateMaterial: (id: number, data: Record<string, unknown>) => api.put(`/materials/${id}`, data),
  deleteMaterial: (id: number) => api.delete(`/materials/${id}`),
  uploadMaterial: (materialId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/materials/${materialId}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  createExercise: (data: Record<string, unknown>) => api.post("/exercises", data),
  deleteExercise: (id: number) => api.delete(`/exercises/${id}`),
  pendingSubmissions: () => api.get("/exercises/submissions/pending"),
  gradeSubmission: (id: number, grade: number, feedback: string) =>
    api.post(`/exercises/submissions/${id}/grade`, { grade, feedback }),
  allPayments: (params?: Record<string, unknown>) => api.get("/payments", { params }),
  markPaid: (userId: number, amount: number, description?: string) =>
    api.post("/payments/mark-paid", { user_id: userId, amount, description }),
  monthlyReport: (year: number, month: number) =>
    api.get("/payments/report/monthly", { params: { year, month } }),
  broadcast: (title: string, message: string) =>
    api.post("/admin/broadcast", null, { params: { title, message } }),
  generateContent: (topic: string, type: string, level: string) =>
    api.post("/ia/generate-content", { topic, content_type: type, level }),
  generateLessonPlan: (topic: string, level: string, duration: number) =>
    api.post("/ia/generate-lesson-plan", { topic, level, duration_minutes: duration }),
  autoBlock: () => api.post("/admin/auto-block-delinquent"),
};
