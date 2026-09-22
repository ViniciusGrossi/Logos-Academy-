"use client";

import { useMemo } from "react";
import type {
  ClassSummary,
  ConsentRecord,
  EnrollmentSummary,
  GuardianRecord,
  AdminStudentAttendanceEntry,
  CurriculumOption,
  Page,
  ProjectSummary,
  ReviewQueueSubmission,
  SessionSummary,
  StudentSummary,
} from "@/specs/api.contracts";
import { useLiveApi } from "@/components/prototype/live-api";

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
  return useLiveApi<Page<StudentSummary>>(query);
}

export function useAdminStudent(studentId: string | undefined) {
  return useLiveApi<StudentDetailData>(studentId ? `/api/admin/students/${studentId}` : null);
}

export function useAdminStudentSubmissions(studentId: string | undefined) {
  return useLiveApi<Page<ReviewQueueSubmission>>(studentId ? `/api/admin/students/${studentId}/submissions?limit=30` : null);
}

export function useAdminStudentAttendance(studentId: string | undefined) {
  return useLiveApi<Page<AdminStudentAttendanceEntry>>(studentId ? `/api/admin/students/${studentId}/attendance?limit=30` : null);
}

export function useAdminClasses(status: ClassSummary["status"] | "all") {
  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (status !== "all") params.set("status", status);
    return `/api/admin/classes?${params}`;
  }, [status]);
  return useLiveApi<Page<ClassSummary>>(query);
}

export function useAdminCurricula() {
  return useLiveApi<readonly CurriculumOption[]>("/api/admin/curricula");
}

export function useAdminClass(classId: string | undefined) {
  return useLiveApi<ClassDetailData>(classId ? `/api/admin/classes/${classId}` : null);
}

