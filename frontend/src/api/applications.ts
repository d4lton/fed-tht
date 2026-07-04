import { API_BASE, apiFetch } from "./client";
import type {
  ApplicationDetailsInput,
  ApplicationSummary,
  ApplicationView,
  ImageUpload
} from "./types";

export function listApplications(): Promise<ApplicationSummary[]> {
  return apiFetch<ApplicationSummary[]>("/applications");
}

export function getApplication(id: string): Promise<ApplicationView> {
  return apiFetch<ApplicationView>(`/applications/${id}`);
}

export function createApplication(input: ApplicationDetailsInput): Promise<ApplicationView> {
  return apiFetch<ApplicationView>("/applications", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateDetails(id: string, input: ApplicationDetailsInput): Promise<ApplicationView> {
  return apiFetch<ApplicationView>(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function updateImages(id: string, images: ImageUpload[]): Promise<ApplicationView> {
  return apiFetch<ApplicationView>(`/applications/${id}/images`, {
    method: "PUT",
    body: JSON.stringify({ images })
  });
}

export function getReasonTexts(): Promise<Record<string, string>> {
  return apiFetch<Record<string, string>>("/reason-texts");
}

/** The URL that serves one label image's bytes (for an <img> src). */
export function imageUrl(id: string, label: string): string {
  return `${API_BASE}/applications/${id}/images/${label}`;
}
