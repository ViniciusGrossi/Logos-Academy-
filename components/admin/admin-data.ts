"use client";

import { useMemo } from "react";
import type {
  ClassSummary,
  AdminDashboard,
  AdminSessionContext,
  CompletionCheck,
  ConsentRecord,
  EnrollmentSummary,
  GuardianRecord,
  AdminStudentAttendanceEntry,
  CurriculumOption,
  ProjectSummary,
  ReviewQueueSubmission,
  SessionSummary,
  StudentSummary,
} from "@/specs/api.contracts";
import { useLiveApi } from "@/components/prototype/live-api";
import { useAdminPagination } from "./use-admin-pagination";

export type StudentDetailData = {
  student: StudentSummary;
  guardian: GuardianRecord;
  consent: ConsentRecord;
  enrollments: readonly EnrollmentSummary[];
  projects: readonly ProjectSummary[];
};

export type ClassDetailData = {
  class: ClassSummary;
  enrollments: readonly EnrollmentSummary[];
  sessions: readonly SessionSummary[];
};

export function useAdminStudents(search: string) {
  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (search.trim()) params.set("search", search.trim());
    return `/api/admin/students?${params}`;
  }, [search]);
  return useAdminPagination<StudentSummary>(query);
}

export function useAdminStudent(studentId: string | undefined) {
  return useLiveApi<StudentDetailData>(studentId ? `/api/admin/students/${studentId}` : null);
}

export function useAdminStudentSubmissions(studentId: string | undefined) {
  return useAdminPagination<ReviewQueueSubmission>(studentId ? `/api/admin/students/${studentId}/submissions?limit=30` : null);
}

export function useAdminStudentAttendance(studentId: string | undefined) {
  return useAdminPagination<AdminStudentAttendanceEntry>(studentId ? `/api/admin/students/${studentId}/attendance?limit=30` : null);
}

export function useAdminClasses(status: ClassSummary["status"] | "all") {
  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (status !== "all") params.set("status", status);
    return `/api/admin/classes?${params}`;
  }, [status]);
  return useAdminPagination<ClassSummary>(query);
}

export function useAdminCurricula() {
  return useLiveApi<readonly CurriculumOption[]>("/api/admin/curricula");
}

export interface AdminEnrollmentOptions {
  curricula: readonly CurriculumOption[];
  classes: readonly { id: string; name: string; curriculumId: string; occupiedSeats: number; capacity: number }[];
}

export function useAdminEnrollmentOptions(open: boolean) {
  return useLiveApi<AdminEnrollmentOptions>(open ? "/api/admin/students/invite/options" : null);
}

export function useAdminClass(classId: string | undefined) {
  return useLiveApi<ClassDetailData>(classId ? `/api/admin/classes/${classId}` : null);
}

export function useAdminSession(sessionId: string) {
  return useLiveApi<AdminSessionContext>(`/api/admin/sessions/${sessionId}`);
}

export function useAdminEnrollmentCalendar(enrollmentId: string | undefined) {
  return useLiveApi<readonly SessionSummary[]>(enrollmentId ? `/api/admin/enrollments/${enrollmentId}/calendar` : null);
}

export function useAdminDashboard(classId: string) {
  return useLiveApi<AdminDashboard>(classId === "all" ? "/api/admin/dashboard" : `/api/admin/dashboard?classId=${encodeURIComponent(classId)}`);
}

export function useEnrollmentCompletion(enrollmentId: string | undefined) {
  return useLiveApi<CompletionCheck>(enrollmentId ? `/api/admin/enrollments/${enrollmentId}/completion` : null);
}
