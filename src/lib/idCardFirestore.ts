import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { IdCardTemplate } from "../types/idCardTemplate";

const DEV = import.meta.env.DEV;

function devLog(event: string, meta: Record<string, unknown>) {
  if (DEV) console.debug("[IdCardFirestore]", event, meta);
}

export function resolveSchoolId(
  profile: { schoolId?: string } | null | undefined,
): string | null {
  const id = profile?.schoolId?.trim();
  return id || null;
}

export function idCardTemplatePath(schoolId: string) {
  return `schools/${schoolId}/settings/idCardTemplate`;
}

export function idCardDocPath(studentId: string) {
  return `id_cards/${studentId}`;
}

export function idCardTemplateRef(schoolId: string) {
  return doc(db, "schools", schoolId, "settings", "idCardTemplate");
}

/** Legacy setting doc IDs under schools/{schoolId}/settings/ */
const LEGACY_TEMPLATE_SETTING_IDS = ["id_card_template", "idCardSettings"];

export async function loadIdCardTemplate(
  schoolId: string,
): Promise<{ data: Partial<IdCardTemplate> | null; path: string }> {
  const primaryPath = idCardTemplatePath(schoolId);
  devLog("load-template:start", { schoolId, path: primaryPath });

  try {
    const primarySnap = await getDoc(idCardTemplateRef(schoolId));
    if (primarySnap.exists()) {
      devLog("load-template:ok", { schoolId, path: primaryPath });
      return { data: primarySnap.data() as Partial<IdCardTemplate>, path: primaryPath };
    }
  } catch (error) {
    devLog("load-template:error", {
      schoolId,
      path: primaryPath,
      code: (error as { code?: string })?.code ?? "unknown",
    });
  }

  for (const legacyId of LEGACY_TEMPLATE_SETTING_IDS) {
    const legacyPath = `schools/${schoolId}/settings/${legacyId}`;
    devLog("load-template:legacy-try", { schoolId, path: legacyPath });
    try {
      const legacyRef = doc(db, "schools", schoolId, "settings", legacyId);
      const legacySnap = await getDoc(legacyRef);
      if (!legacySnap.exists()) continue;

      const legacyData = legacySnap.data() as Partial<IdCardTemplate>;
      devLog("load-template:legacy-hit", { schoolId, path: legacyPath });

      // Copy into canonical path; legacy doc is left intact.
      await setDoc(
        idCardTemplateRef(schoolId),
        { ...legacyData, migratedFrom: legacyPath, updatedAt: serverTimestamp() },
        { merge: true },
      );
      devLog("load-template:migrated", { schoolId, from: legacyPath, to: primaryPath });
      return { data: legacyData, path: primaryPath };
    } catch (error) {
      devLog("load-template:legacy-error", {
        schoolId,
        path: legacyPath,
        code: (error as { code?: string })?.code ?? "unknown",
      });
    }
  }

  devLog("load-template:not-found", { schoolId, path: primaryPath });
  return { data: null, path: primaryPath };
}

export async function saveIdCardTemplate(
  schoolId: string,
  template: IdCardTemplate,
): Promise<void> {
  const path = idCardTemplatePath(schoolId);
  devLog("save-template:start", { schoolId, path });
  try {
    await setDoc(
      idCardTemplateRef(schoolId),
      { ...template, schoolId, updatedAt: serverTimestamp() },
      { merge: true },
    );
    devLog("save-template:ok", { schoolId, path });
  } catch (error) {
    devLog("save-template:error", {
      schoolId,
      path,
      code: (error as { code?: string })?.code ?? "unknown",
    });
    throw error;
  }
}

export function normalizeIdCardFromSnapshot(
  snap: DocumentSnapshot,
): { studentId: string; data: Record<string, unknown> } | null {
  if (!snap.exists()) return null;
  const raw = snap.data() as Record<string, unknown>;
  const studentId =
    typeof raw.studentId === "string" && raw.studentId.trim()
      ? raw.studentId.trim()
      : snap.id;
  return {
    studentId,
    data: { id: snap.id, ...raw, studentId },
  };
}

export async function saveIdCard(
  schoolId: string,
  studentId: string,
  payload: Record<string, unknown>,
  isNew: boolean,
): Promise<void> {
  const path = idCardDocPath(studentId);
  devLog("save-card:start", { schoolId, path, isNew });
  const ref = doc(db, "id_cards", studentId);
  try {
    await setDoc(
      ref,
      {
        ...payload,
        studentId,
        schoolId,
        updatedAt: serverTimestamp(),
        ...(isNew ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: true },
    );
    devLog("save-card:ok", { schoolId, path });
  } catch (error) {
    devLog("save-card:error", {
      schoolId,
      path,
      code: (error as { code?: string })?.code ?? "unknown",
    });
    throw error;
  }
}
