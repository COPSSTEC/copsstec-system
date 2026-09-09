import type {
  AdminCourse,
  BulkActionResponse,
  Course,
  CourseFormInput,
  CourseInscription,
  MemberOption,
} from "@/modules/courses/domain/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiErrorBody {
  detail?: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  let message = "No fue posible completar la solicitud.";

  try {
    const body = (await response.json()) as ApiErrorBody;
    message = body.detail ?? message;
  } catch {
    message = response.statusText || message;
  }

  throw new Error(message);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listPublicCourses(): Promise<Course[]> {
  const response = await fetch(`${API_URL}/api/courses/public`, {
    cache: "no-store",
  });

  return parseResponse<Course[]>(response);
}

export async function getPublicCourse(courseId: number): Promise<Course> {
  const response = await fetch(`${API_URL}/api/courses/public/${courseId}`, {
    cache: "no-store",
  });

  return parseResponse<Course>(response);
}

export async function createGuestInscription(
  courseId: number,
  input: FormData,
): Promise<{ id: number; course_id: number; state_id: number; message: string }> {
  const response = await fetch(`${API_URL}/api/courses/public/${courseId}/guest-inscriptions`, {
    method: "POST",
    body: input,
  });

  return parseResponse<{ id: number; course_id: number; state_id: number; message: string }>(
    response,
  );
}

export async function listAdminCourses(token: string): Promise<AdminCourse[]> {
  const response = await fetch(`${API_URL}/api/courses/admin`, {
    headers: authHeaders(token),
  });

  return parseResponse<AdminCourse[]>(response);
}

export async function createCourse(
  token: string,
  input: CourseFormInput,
): Promise<Course> {
  const response = await fetch(`${API_URL}/api/courses/admin`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<Course>(response);
}

export async function updateCourse(
  token: string,
  courseId: number,
  input: CourseFormInput,
): Promise<Course> {
  const response = await fetch(`${API_URL}/api/courses/admin/${courseId}`, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<Course>(response);
}

export async function deleteCourse(token: string, courseId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/courses/admin/${courseId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  return parseResponse<void>(response);
}

export async function finishCourse(token: string, courseId: number): Promise<Course> {
  const response = await fetch(`${API_URL}/api/courses/admin/${courseId}/finish`, {
    method: "POST",
    headers: authHeaders(token),
  });

  return parseResponse<Course>(response);
}

export async function listMemberOptions(
  token: string,
  query: string,
): Promise<MemberOption[]> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const response = await fetch(`${API_URL}/api/courses/admin/members?${params}`, {
    headers: authHeaders(token),
  });

  return parseResponse<MemberOption[]>(response);
}

export async function createMemberInscriptions(
  token: string,
  courseId: number,
  userIds: number[],
): Promise<BulkActionResponse> {
  const response = await fetch(`${API_URL}/api/courses/admin/${courseId}/member-inscriptions`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ user_ids: userIds }),
  });

  return parseResponse<BulkActionResponse>(response);
}

export async function listCourseInscriptions(
  token: string,
  courseId: number,
): Promise<CourseInscription[]> {
  const response = await fetch(`${API_URL}/api/courses/admin/${courseId}/inscriptions`, {
    headers: authHeaders(token),
  });

  return parseResponse<CourseInscription[]>(response);
}

export async function approvePayment(
  token: string,
  inscriptionId: number,
): Promise<CourseInscription> {
  const response = await fetch(
    `${API_URL}/api/courses/admin/inscriptions/${inscriptionId}/approve-payment`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );

  return parseResponse<CourseInscription>(response);
}

export async function rejectPayment(
  token: string,
  inscriptionId: number,
  observation: string,
): Promise<CourseInscription> {
  const response = await fetch(
    `${API_URL}/api/courses/admin/inscriptions/${inscriptionId}/reject-payment`,
    {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ observation }),
    },
  );

  return parseResponse<CourseInscription>(response);
}

export async function updateAttendance(
  token: string,
  inscriptionId: number,
  attended: boolean,
): Promise<CourseInscription> {
  const response = await fetch(
    `${API_URL}/api/courses/admin/inscriptions/${inscriptionId}/attendance`,
    {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ attended }),
    },
  );

  return parseResponse<CourseInscription>(response);
}

export async function generateCertificate(
  token: string,
  inscriptionId: number,
): Promise<{ id: number; certificate_code: string; pdf_path: string }> {
  const response = await fetch(
    `${API_URL}/api/courses/admin/inscriptions/${inscriptionId}/certificate`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );

  return parseResponse<{ id: number; certificate_code: string; pdf_path: string }>(response);
}

export function certificateDownloadUrl(certificateId: number): string {
  return `${API_URL}/api/courses/admin/certificates/${certificateId}/download`;
}

export async function downloadCertificate(
  token: string,
  certificateId: number,
): Promise<Blob> {
  const response = await fetch(certificateDownloadUrl(certificateId), {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    await parseResponse<never>(response);
  }

  return response.blob();
}

export async function downloadAttendeesReport(
  token: string,
  courseId: number,
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/api/courses/admin/${courseId}/attendees-report?format=csv`,
    {
      headers: authHeaders(token),
    },
  );

  if (!response.ok) {
    await parseResponse<never>(response);
  }

  return response.blob();
}

export async function sendCertificates(
  token: string,
  courseId: number,
  inscriptionIds: number[],
): Promise<BulkActionResponse> {
  const response = await fetch(`${API_URL}/api/courses/admin/${courseId}/certificates/send`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ inscription_ids: inscriptionIds }),
  });

  return parseResponse<BulkActionResponse>(response);
}

export async function generateFeedbackLink(
  token: string,
  inscriptionId: number,
): Promise<{ token: string; url: string }> {
  const response = await fetch(
    `${API_URL}/api/courses/admin/inscriptions/${inscriptionId}/feedback-link`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );

  return parseResponse<{ token: string; url: string }>(response);
}

export async function sendFeedbackLinks(
  token: string,
  courseId: number,
  inscriptionIds: number[],
): Promise<BulkActionResponse> {
  const response = await fetch(`${API_URL}/api/courses/admin/${courseId}/feedback-links/send`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ inscription_ids: inscriptionIds }),
  });

  return parseResponse<BulkActionResponse>(response);
}

export async function getFeedbackContext(
  token: string,
): Promise<{ course_title: string; date_course: string; participant_name: string }> {
  const response = await fetch(`${API_URL}/api/courses/feedback/${token}`);

  return parseResponse<{ course_title: string; date_course: string; participant_name: string }>(
    response,
  );
}

export async function submitFeedback(
  token: string,
  input: {
    rating: number;
    content_rating?: number;
    instructor_rating?: number;
    platform_rating?: number;
    comments?: string;
  },
): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/api/courses/feedback/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<{ message: string }>(response);
}
