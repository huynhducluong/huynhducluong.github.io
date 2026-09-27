import type { SkillGroup } from "../types/career";

const sameLabel = (label: string) => ({ en: label, vi: label });

export const skillGroups: SkillGroup[] = [
  {
    id: "software",
    title: { en: "Software", vi: "Phần mềm" },
    items: [
      { id: "acc", label: sameLabel("Autodesk Construction Cloud") },
      { id: "revit", label: sameLabel("Autodesk Revit") },
      { id: "civil-3d", label: sameLabel("Autodesk Civil 3D") },
      { id: "navisworks", label: sameLabel("Autodesk Navisworks Manage") },
      { id: "infraworks", label: sameLabel("Autodesk InfraWorks") },
    ],
  },
  {
    id: "automation",
    title: { en: "Automation", vi: "Tự động hóa" },
    items: [
      { id: "dynamo-python", label: sameLabel("Dynamo & Python") },
      { id: "csharp-apis", label: sameLabel("C# - Revit/Civil 3D API") },
      { id: "dotnet-wpf", label: sameLabel(".NET & WPF") },
      { id: "git", label: sameLabel("Git/GitHub") },
    ],
  },
];
