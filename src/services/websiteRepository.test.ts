import { beforeEach, describe, expect, it, vi } from "vitest";
import { professionalProfileSeed, websiteContentSeed } from "../data/websiteSeed";
import type { PortfolioProject } from "../types/portfolio";
import type { WebsiteRuntimeData } from "../types/website";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));

import { publishWebsiteRelease, saveProfessionalProfile, saveWebsiteContent } from "./websiteRepository";

const project = (id: string, displayOrder: number, status: PortfolioProject["status"], websiteVisible = true): WebsiteRuntimeData["projects"][number] => ({
  id,
  slug: id,
  name: { en: id, vi: id },
  location: { en: "HCMC", vi: "TP.HCM" },
  summary: { en: "Summary", vi: "Tóm tắt" },
  challenge: { en: "Challenge", vi: "Thách thức" },
  approach: { en: "Approach", vi: "Giải pháp" },
  outcome: { en: "Outcome", vi: "Kết quả" },
  isCurrent: false,
  responsibilities: [],
  technologies: [],
  images: [],
  featured: false,
  status,
  displayOrder,
  includeInPortfolio: false,
  portfolioOrder: 0,
  portfolioLayout: "standard",
  includeInCv: false,
  cvOrder: 0,
  cvDisplay: "compact",
  cvShowSummary: false,
  cvResponsibilityIds: [],
  websiteVisible,
});

const runtime = (): WebsiteRuntimeData => ({
  content: structuredClone(websiteContentSeed),
  professional: structuredClone(professionalProfileSeed),
  projects: [
    project("later", 2, "published"),
    project("draft", 0, "draft"),
    project("hidden", 1, "published", false),
    project("first", 1, "published"),
  ],
  tools: [],
});

describe("Website save and publish contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it("saves the editable Website content to the primary draft", async () => {
    await saveWebsiteContent(websiteContentSeed);
    expect(mocks.from).toHaveBeenCalledWith("website_content");
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: "primary",
      version: websiteContentSeed.version,
      content_selection: websiteContentSeed.contentSelection,
    }));
  });

  it("publishes one filtered, ordered snapshot through the transactional RPC", async () => {
    await publishWebsiteRelease(runtime());
    expect(mocks.rpc).toHaveBeenCalledOnce();
    const [name, args] = mocks.rpc.mock.calls[0] as [string, { p_version: string; p_payload: WebsiteRuntimeData }];
    expect(name).toBe("publish_website");
    expect(args.p_version).toBe(websiteContentSeed.version);
    expect(args.p_payload.projects.map((item) => item.id)).toEqual(["first", "later"]);
  });

  it("saves the shared Professional Profile through its transactional RPC", async () => {
    await saveProfessionalProfile(professionalProfileSeed);
    expect(mocks.rpc).toHaveBeenCalledWith("save_professional_profile", {
      p_profile: professionalProfileSeed.profile,
      p_experiences: professionalProfileSeed.experiences,
      p_education: professionalProfileSeed.education,
      p_skill_groups: professionalProfileSeed.skillGroups,
      p_languages: professionalProfileSeed.languages,
    });
  });
});
