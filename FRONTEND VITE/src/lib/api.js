import axios from "axios";

const API_URL = "http://localhost:3001/api";
console.log("🔧 API Service initialized with base URL:", API_URL);

// Cookie utility functions
export const getCookie = (name) => {
  console.log("🍪 Getting cookie:", name);
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = decodeURIComponent(c.substring(nameEQ.length, c.length));
      console.log("✅ Cookie found:", name, "=", value);
      return value;
    }
  }
  console.log("❌ Cookie not found:", name);
  return null;
};

const setCookie = (name, value, days = 7) => {
  console.log("🍪 Setting cookie:", name, "with value:", value, "for", days, "days");
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
  console.log("✅ Cookie set successfully:", name);
};

const removeCookie = (name) => {
  console.log("🗑️ Removing cookie:", name);
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict;Secure`;
  console.log("✅ Cookie removed:", name);
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});
console.log("📡 Axios instance created with credentials enabled");

// Request interceptor with debug logging
api.interceptors.request.use((config) => {
  console.log("🚀 Making API request:", {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`,
    headers: config.headers,
    data: config.data
  });
  
  const token = getCookie("access_token");
  if (token) {
    console.log("🔐 Token found in cookies, adding to request headers");
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.log("⚠️ No access token found in cookies");
  }
  
  return config;
});

// Response interceptor with debug logging
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response Success:", {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error("❌ API Response Error:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      responseData: error.response?.data,
      headers: error.response?.headers
    });
    
    if (!error.response) {
      console.error("🌐 Network error detected:", error);
      throw new Error(
        "Erro de conexão com o servidor. Verifique sua conexão de internet."
      );
    }
    return Promise.reject(error);
  }
);

export async function loginAndFetchDetailsApi(email, password) {
  console.log("🔑 Starting login process for email:", email);
  
  try {
    console.log("📤 Sending login request...");
    const response = await api.post("/auth/login", { email, password });
    console.log("✅ Login successful, received response:", response.data);
    
    const { access_token } = response.data;
    console.log("🎫 Access token received, storing in cookies");
    setCookie('access_token', access_token, 7);
    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    console.log("🔐 Authorization header set globally");

    console.log("👤 Fetching user details...");
    const userResponse = await api.get("/users/me");
    const userData = userResponse.data;
    console.log("✅ User data received:", userData);

    let enrollmentData = undefined;

    if (userData.role === "student" && userData.email && userData.enrollment_id) {
      console.log("🎓 User is a student, fetching enrollment data. Enrollment ID:", userData.enrollment_id);
      
      try {
        const enrollmentRes = await api.get(
          `/enrollments/${userData.enrollment_id}/details`
        );
        console.log("📚 Enrollment API response:", enrollmentRes.data);
        
        if (enrollmentRes.data) {
          enrollmentData = enrollmentRes.data;
          console.log("✅ Enrollment data found:", enrollmentData);
          setCookie("enrollmentId", enrollmentData.id.toString(), 7);
          console.log("💾 Enrollment ID stored in cookies:", enrollmentData.id);
        } else {
          console.warn("⚠️ No enrollment data found for user ID:", userData.enrollment_id);
        }
      } catch (enrollmentError) {
        console.error("❌ Error fetching enrollment data:", {
          message: enrollmentError.response?.data?.message || enrollmentError.message,
          status: enrollmentError.response?.status,
          enrollmentId: userData.enrollment_id
        });
      }
    } else {
      console.log("ℹ️ User is not a student or missing enrollment info:", {
        role: userData.role,
        email: userData.email,
        enrollment_id: userData.enrollment_id
      });
    }

    console.log("💾 Storing user data in cookies");
    setCookie("userData", JSON.stringify(userData), 7);
    
    const result = { accessToken: access_token, userData, enrollmentData };
    console.log("🎉 Login process completed successfully:", result);
    return result;
    
  } catch (error) {
    console.error("❌ Login process failed:", {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      data: error.response?.data,
      email: email
    });
    
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      "Login failed. Please check your credentials.";
    
    console.log("🧹 Cleaning up authorization header due to login failure");
    delete api.defaults.headers.common["Authorization"];
    
    throw new Error(errorMessage);
  }
}

export function clearApiToken() {
  console.log("🧹 Clearing API tokens and user data");
  delete api.defaults.headers.common["Authorization"];
  removeCookie("access_token");
  removeCookie("userData");
  removeCookie("enrollmentId");
  removeCookie("candidateData");
  removeCookie("enrollmentData");
  console.log("✅ API tokens and user data cleared");
}

export async function logout() {
  console.log("🚪 Logging out user");
  clearApiToken();
  console.log("✅ Logout completed");
}

export async function fetchCourses() {
  console.log("📚 Fetching courses...");
  
  try {
    const response = await api.get("/courses");
    console.log("✅ Courses fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching courses:", {
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    });
    throw new Error("Failed to fetch courses.");
  }
}

function handleApiError(error) {
  console.error("🔧 Handling API error:", {
    isAxiosError: axios.isAxiosError(error),
    message: error.message,
    response: error.response?.data
  });
  
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || "Erro na requisição.";
    console.error("📡 Axios error detected:", message);
    throw new Error(message);
  }
  
  console.error("🌐 Network/connection error");
  throw new Error("Erro de conexão com o servidor.");
}

export async function fetchDisciplinesByCourse(courseId) {
  console.log("📖 Fetching disciplines for course ID:", courseId);
  
  try {
    const response = await api.get(`/disciplines/courses/${courseId}`);
    console.log("✅ Disciplines fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching disciplines:", {
      courseId,
      message: error.response?.data?.message || error.message
    });
    throw new Error("Failed to fetch disciplines.");
  }
}

export async function createCourse(data) {
  console.log("➕ Creating new course with data:", data);
  
  try {
    const response = await api.post("/courses", data);
    console.log("✅ Course created successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating course:", data);
    handleApiError(error);
  }
}

export async function createDiscipline(data) {
  console.log("➕ Creating new discipline with data:", data);
  
  try {
    const response = await api.post("/disciplines", data);
    console.log("✅ Discipline created successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating discipline:", data);
    handleApiError(error);
  }
}

export async function createExam(examData) {
  console.log("📝 Creating exam with data:", examData);
  
  const courseId = Number(examData.course_id);
  const disciplineId = Number(examData.discipline_id);
  const academicPeriodId = Number(examData.academic_period_id);
  const duration = Number(examData.duration_minutes);

  console.log("🔢 Converted numeric values:", {
    courseId,
    disciplineId,
    academicPeriodId,
    duration
  });

  if (
    isNaN(courseId) ||
    isNaN(disciplineId) ||
    isNaN(academicPeriodId) ||
    isNaN(duration)
  ) {
    console.error("❌ Invalid numeric values detected:", {
      courseId: examData.course_id,
      disciplineId: examData.discipline_id,
      academicPeriodId: examData.academic_period_id,
      duration: examData.duration_minutes
    });
    throw new Error(
      "Invalid course, discipline, academic period ID, or duration."
    );
  }

  const payload = {
    name: examData.name,
    course_id: courseId,
    discipline_id: disciplineId,
    academic_period_id: academicPeriodId,
    type: examData.type,
    exam_date: new Date(examData.exam_date).toISOString(),
    duration_minutes: duration,
    max_score: examData.max_score || 20,
    second_call_eligible: examData.second_call_eligible,
    second_call_date:
      examData.second_call_eligible && examData.second_call_date
        ? new Date(examData.second_call_date).toISOString()
        : null,
    publication_date: new Date(examData.publication_date).toISOString(),
    questions: examData.questions.map((q) => ({
      text: q.text,
      type: q.type,
      options: q.options,
      correct_answer: q.correct_answer,
      score: Number(q.score) || 1,
    })),
  };

  console.log("📤 Exam payload prepared:", payload);

  try {
    const response = await api.post("/exams", payload);
    console.log("✅ Exam created successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating exam:", {
      payload,
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Error creating exam.";
    throw new Error(message);
  }
}

export async function fetchSystemStats() {
  console.log("📊 Fetching system statistics...");
  
  try {
    const response = await api.get("/admin/dashboard/stats");
    console.log("✅ System stats fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching system stats:", {
      message: error.response?.data?.message || error.message,
      status: error.response?.status
    });
    const message = error.response?.data?.message || "Erro ao buscar estatísticas.";
    throw new Error(message);
  }
}

export async function fetchRecentCandidates() {
  console.log("👥 Fetching recent candidates...");
  
  try {
    const response = await api.get("/users/recent?role=candidate&limit=5");
    console.log("✅ Recent candidates fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching recent candidates:", {
      message: error.response?.data?.message || error.message
    });
    const message = error.response?.data?.message || "Erro ao buscar candidatos recentes.";
    throw new Error(message);
  }
}

export async function uploadExam(examData) {
  console.log("📤 Uploading exam with data:", examData);
  
  const payload = {
    name: examData.name,
    course_id: examData.course_id,
    academic_period_id: 2,
    type: examData.type,
    exam_date: new Date(examData.exam_date).toISOString(),
    duration_minutes: examData.duration_minutes,
    max_score: examData.max_score || 20,
    second_call_eligible: examData.second_call_eligible || false,
    second_call_date:
      examData.second_call_eligible && examData.second_call_date
        ? new Date(examData.second_call_date).toISOString()
        : null,
    publication_date: examData.publication_date
      ? new Date(examData.publication_date).toISOString()
      : new Date().toISOString(),
    content_matrix_id: examData.content_matrix_id,
    questions: examData.questions.map((q) => ({
      text: q.text,
      type: q.type,
      options: q.options,
      correct_answer: q.correct_answer,
      score: q.score || 1,
    })),
  };

  console.log("📦 Upload payload prepared:", payload);

  try {
    const response = await api.post("/exams", payload);
    console.log("✅ Exam uploaded successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error uploading exam:", {
      payload,
      error: error.response?.data?.message || error.message
    });
    const message = error.response?.data?.message || "Error creating exam.";
    throw new Error(message);
  }
}

export async function approveEnrollment(enrollmentId, data) {
  console.log("✅ Approving enrollment:", { enrollmentId, data });
  
  try {
    const response = await api.patch(`/enrollments/${enrollmentId}`, data);
    console.log("✅ Enrollment approved successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error approving enrollment:", {
      enrollmentId,
      data,
      error: error.response?.data?.message || error.message
    });
    const message = error.response?.data?.message || "Erro ao aprovar matrícula.";
    throw new Error(message);
  }
}

export async function gradeExam(data) {
  console.log("📊 Grading exam with data:", data);
  
  try {
    const response = await api.post("/grades", data);
    console.log("✅ Exam graded successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error grading exam:", {
      data,
      error: error.response?.data?.message || error.message
    });
    const message = error.response?.data?.message || "Erro ao corrigir prova.";
    throw new Error(message);
  }
}

export async function fetchUpcomingExams(courseId) {
  console.log("📅 Fetching upcoming exams for course ID:", courseId);
  
  try {
    let url = "/exams/upcoming/details?limit=3";
    if (courseId) {
      url += `&course_id=${courseId}`;
    }
    console.log("🔗 Request URL:", url);
    
    const response = await api.get(url);
    console.log("✅ Upcoming exams fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching upcoming exams:", {
      courseId,
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch upcoming exams.";
    throw new Error(message);
  }
}

export async function fetchStudentResults(enrollmentId) {
  console.log("📊 Fetching student results for enrollment ID:", enrollmentId);
  
  try {
    const response = await api.get(`/grades/student/${enrollmentId}`);
    console.log("✅ Student results fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching student results:", {
      enrollmentId,
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch student results.";
    throw new Error(message);
  }
}

export async function fetchAdminAllExamResults() {
  console.log("📊 Fetching all exam results for admin...");
  
  try {
    const response = await api.get("/exams");
    console.log("✅ All exam results fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching admin exam results:", {
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch all exam results.";
    throw new Error(message);
  }
}

export async function fetchEnrollmentDetails(enrollmentId) {
  console.log("📋 Fetching enrollment details for ID:", enrollmentId);
  
  try {
    const response = await api.get(`/enrollments/${enrollmentId}/details`);
    console.log("✅ Enrollment details fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching enrollment details:", {
      enrollmentId,
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch enrollment details.";
    throw new Error(message);
  }
}

export async function fetchCandidates() {
  console.log("👥 Fetching all candidates...");
  
  try {
    const response = await api.get("users");
    console.log("✅ Candidates fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching candidates:", {
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch candidates.";
    throw new Error(message);
  }
}

export async function fetchCandidateDetails(id) {
  console.log("👤 Fetching candidate details for ID:", id);
  
  try {
    const response = await api.get(`/users/${id}`);
    console.log("✅ Candidate details fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching candidate details:", {
      id,
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch candidate details.";
    throw new Error(message);
  }
}

export async function fetchExams(courseId) {
  console.log("📝 Fetching exams for course ID:", courseId);
  
  try {
    const url = courseId ? `/exams?course_id=${courseId}` : "/exams";
    console.log("🔗 Request URL:", url);
    
    const response = await api.get(url);
    console.log("✅ Exams fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching exams:", {
      courseId,
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch exams.";
    throw new Error(message);
  }
}

export async function fetchExamDetails(id) {
  console.log("📝 Fetching exam details for ID:", id);
  
  try {
    const response = await api.get(`/exams/${id}`);
    console.log("✅ Exam details fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching exam details:", {
      id,
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch exam details.";
    throw new Error(message);
  }
}

export async function fetchEnrollmentChartData() {
  console.log("📈 Fetching enrollment chart data...");
  
  try {
    const response = await api.get("/stats/enrollments-by-month");
    console.log("✅ Enrollment chart data fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching enrollment chart data:", {
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch chart data.";
    throw new Error(message);
  }
}

export async function fetchStudentPerformance(enrollmentId) {
  console.log("📊 Fetching student performance for enrollment ID:", enrollmentId);
  
  try {
    const response = await api.get(`/grades/student/${enrollmentId}/performance`);
    console.log("✅ Student performance fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching student performance:", {
      enrollmentId,
      error: error.response?.data?.detail || error.message
    });
    const message = error.response?.data?.detail || "Failed to fetch student performance.";
    throw new Error(message);
  }
}

export async function submitExamAnswers(payload) {
  console.log("📝 Submitting exam answers:", payload);
  try {
    const accessToken = getCookie('access_token');
    const response = await axios.post(`${API_URL}/student_answers/submit_bulk`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("✅ Exam answers submitted successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error submitting exam answers:", {
      payload,
      error: error.response?.data?.message || error.message,
    });
    const message = error.response?.data?.message || 'Falha ao submeter as respostas.';
    throw new Error(message);
  }
};

export async function fetchDocumentsByEnrollment(enrollmentId) {
  console.log("📄 Fetching documents for enrollment ID:", enrollmentId);
  
  try {
    const response = await api.get(
      `/enrollment_docs/by-enrollment/${enrollmentId}`
    );
    console.log("✅ Documents fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching documents:", {
      enrollmentId,
      error: error.response?.data?.message || error.message
    });
    const message = error.response?.data?.message || "Failed to fetch documents.";
    throw new Error(message);
  }
}

console.log("🎯 API Service module loaded successfully");

export { api };