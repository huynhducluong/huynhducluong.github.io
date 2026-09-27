import type { ContentPoint, LocalizedText, Project } from "../types/career";

const point = (id: string, en: string, vi: string): ContentPoint => ({
  id,
  text: { en, vi },
});

const coordinationPoints = (
  prefix: string,
  automation: LocalizedText,
): ContentPoint[] => [
  point(
    prefix + "-lead",
    "Led the BIM modeling team and coordinated multidisciplinary models.",
    "Dẫn dắt đội ngũ mô hình BIM và phối hợp mô hình đa bộ môn.",
  ),
  point(
    prefix + "-quality",
    "Reviewed model quality and resolved coordination and clash issues.",
    "Kiểm tra chất lượng mô hình và xử lý các vấn đề phối hợp, xung đột.",
  ),
  point(
    prefix + "-acc",
    "Managed BIM models and deliverables through Autodesk Construction Cloud.",
    "Quản lý mô hình BIM và hồ sơ bàn giao qua Autodesk Construction Cloud.",
  ),
  { id: prefix + "-automation", text: automation },
];

const modelingPoints = (prefix: string): ContentPoint[] => [
  point(
    prefix + "-lead",
    "Led BIM modelers to produce models for various project components.",
    "Dẫn dắt nhóm BIM triển khai mô hình cho nhiều hạng mục dự án.",
  ),
  point(
    prefix + "-modeling",
    "Used Revit Families and Civil 3D for project modeling.",
    "Sử dụng Revit Families và Civil 3D để triển khai mô hình dự án.",
  ),
  point(
    prefix + "-cde",
    "Set up, managed, and coordinated models in a Common Data Environment.",
    "Thiết lập, quản lý và phối hợp mô hình trên môi trường dữ liệu chung.",
  ),
  point(
    prefix + "-reports",
    "Published BIM reports using Autodesk Construction Cloud.",
    "Phát hành báo cáo BIM bằng Autodesk Construction Cloud.",
  ),
];

const currentAutomation: LocalizedText = {
  en: "Developed Revit and Civil 3D tools using C#, WPF, Dynamo, and Python to improve modeling efficiency.",
  vi: "Phát triển công cụ Revit và Civil 3D bằng C#, WPF, Dynamo và Python để nâng cao hiệu quả dựng mô hình.",
};

const dynamoAutomation: LocalizedText = {
  en: "Developed Dynamo and Python tools for Revit and Civil 3D to improve modeling efficiency.",
  vi: "Phát triển công cụ Dynamo và Python cho Revit và Civil 3D để nâng cao hiệu quả dựng mô hình.",
};

export const projects: Project[] = [
  {
    id: "hon-khoai-road",
    name: {
      en: "Duong giao thong ra dao Hon Khoai",
      vi: "Đường giao thông ra đảo Hòn Khoai",
    },
    location: { en: "Ca Mau", vi: "Cà Mau" },
    role: { en: "BIM Coordinator", vi: "Điều phối viên BIM" },
    summary: {
      en: "The project includes Viet Nam's longest sea-crossing bridge, extending over 18 km and representing an investment of more than VND 25.7 trillion. It connects the Dat Mui area to the Hon Khoai dual-use port in Ca Mau Province.",
      vi: "Dự án gồm cây cầu vượt biển dài nhất Việt Nam, dài hơn 18 km với tổng mức đầu tư hơn 25,7 nghìn tỷ đồng, kết nối khu vực Đất Mũi với cảng lưỡng dụng Hòn Khoai tại Cà Mau.",
    },
    startDate: "2026-02",
    endDate: null,
    responsibilities: coordinationPoints("hon-khoai", currentAutomation),
    technologies: ["Revit", "Civil 3D", "Navisworks", "ACC", "C#", "WPF", "Dynamo", "Python"],
    imagePaths: [],
    featured: true,
    displayOrder: 1,
  },
  {
    id: "ca-mau-cai-nuoc-expressway",
    name: { en: "Cao toc Ca Mau - Cai Nuoc", vi: "Cao tốc Cà Mau - Cái Nước" },
    location: { en: "Ca Mau", vi: "Cà Mau" },
    role: { en: "BIM Coordinator", vi: "Điều phối viên BIM" },
    summary: {
      en: "The 42-km Ca Mau-Cai Nuoc Expressway project includes 37 bridges and forms a key section of the expressway extending toward Dat Mui, improving regional connectivity and supporting economic development in the Mekong Delta.",
      vi: "Dự án cao tốc Cà Mau - Cái Nước dài 42 km, gồm 37 cây cầu và là đoạn quan trọng của tuyến cao tốc hướng về Đất Mũi, tăng cường kết nối và hỗ trợ phát triển kinh tế Đồng bằng sông Cửu Long.",
    },
    startDate: "2026-02",
    endDate: null,
    responsibilities: coordinationPoints("ca-mau-cai-nuoc", currentAutomation),
    technologies: ["Revit", "Civil 3D", "Navisworks", "ACC", "C#", "WPF", "Dynamo", "Python"],
    imagePaths: [],
    featured: true,
    displayOrder: 2,
  },
  {
    id: "la-son-hoa-lien-expressway",
    name: { en: "Cao toc La Son - Hoa Lien", vi: "Cao tốc La Sơn - Hòa Liên" },
    location: {
      en: "Quang Tri, Thua Thien Hue",
      vi: "Quảng Trị, Thừa Thiên Huế",
    },
    role: {
      en: "BIM Modeling Team Leader & BIM Coordinator",
      vi: "Trưởng nhóm mô hình BIM & Điều phối viên BIM",
    },
    summary: {
      en: "The project aims to improve the capacity of the La Son - Hoa Lien route and other regional expressways, enhancing the overall efficiency of the North-South Expressway. The route is 65 km long and includes 50 bridges.",
      vi: "Dự án nâng cao năng lực tuyến La Sơn - Hòa Liên và các tuyến cao tốc trong khu vực, góp phần tăng hiệu quả toàn tuyến cao tốc Bắc - Nam. Tuyến dài 65 km và gồm 50 cây cầu.",
    },
    startDate: "2025-01",
    endDate: "2025-05",
    responsibilities: coordinationPoints("la-son-hoa-lien", dynamoAutomation),
    technologies: ["Revit", "Civil 3D", "Navisworks", "ACC", "Dynamo", "Python"],
    imagePaths: [],
    featured: false,
    displayOrder: 3,
  },
  {
    id: "cam-lo-la-son-expressway",
    name: { en: "Cao toc Cam Lo - La Son", vi: "Cao tốc Cam Lộ - La Sơn" },
    location: {
      en: "Quang Tri, Thua Thien Hue",
      vi: "Quảng Trị, Thừa Thiên Huế",
    },
    role: {
      en: "BIM Modeling Team Leader & BIM Coordinator",
      vi: "Trưởng nhóm mô hình BIM & Điều phối viên BIM",
    },
    summary: {
      en: "The project expands the Cam Lo - La Son Expressway from two to four lanes, following the Government-approved plan. The route is 98.35 km long and includes 35 bridges.",
      vi: "Dự án mở rộng cao tốc Cam Lộ - La Sơn từ hai lên bốn làn xe theo phương án được Chính phủ phê duyệt. Tuyến dài 98,35 km và gồm 35 cây cầu.",
    },
    startDate: "2025-01",
    endDate: "2025-05",
    responsibilities: coordinationPoints("cam-lo-la-son", dynamoAutomation),
    technologies: ["Revit", "Civil 3D", "Navisworks", "ACC", "Dynamo", "Python"],
    imagePaths: [],
    featured: false,
    displayOrder: 4,
  },
  {
    id: "tham-luong-ben-cat-rach-nuoc-len",
    name: {
      en: "Kenh Tham Luong - Ben Cat - Rach Nuoc Len",
      vi: "Kênh Tham Lương - Bến Cát - Rạch Nước Lên",
    },
    location: { en: "Ho Chi Minh City", vi: "Thành phố Hồ Chí Minh" },
    role: {
      en: "BIM Modeling Team Leader & BIM Coordinator",
      vi: "Trưởng nhóm mô hình BIM & Điều phối viên BIM",
    },
    summary: {
      en: "The project is a 31.464 km urban infrastructure project in Ho Chi Minh City, enhancing regional connectivity and improving environmental conditions along the canal corridor.",
      vi: "Dự án hạ tầng đô thị dài 31,464 km tại Thành phố Hồ Chí Minh, tăng cường kết nối khu vực và cải thiện điều kiện môi trường dọc hành lang kênh.",
    },
    startDate: "2022-07",
    endDate: "2025-03",
    responsibilities: coordinationPoints("tham-luong", dynamoAutomation),
    technologies: ["Revit", "Civil 3D", "Navisworks", "ACC", "Dynamo", "Python"],
    imagePaths: [],
    featured: true,
    displayOrder: 5,
  },
  {
    id: "cao-lanh-an-huu-expressway",
    name: {
      en: "Cao toc Cao Lanh - An Huu (Phase 1)",
      vi: "Cao tốc Cao Lãnh - An Hữu (Giai đoạn 1)",
    },
    location: { en: "Dong Thap", vi: "Đồng Tháp" },
    role: {
      en: "BIM Modeling Team Leader & BIM Coordinator",
      vi: "Trưởng nhóm mô hình BIM & Điều phối viên BIM",
    },
    summary: {
      en: "The project is a key east-west route in the Mekong Delta. It serves transport demand along the northern bank of the Tien River and helps reduce traffic on National Highway 30.",
      vi: "Dự án là tuyến đông - tây quan trọng tại Đồng bằng sông Cửu Long, phục vụ nhu cầu vận tải dọc bờ bắc sông Tiền và giảm tải cho Quốc lộ 30.",
    },
    startDate: "2024-08",
    endDate: "2024-11",
    responsibilities: modelingPoints("cao-lanh-an-huu"),
    technologies: ["Revit", "Civil 3D", "ACC"],
    imagePaths: [],
    featured: false,
    displayOrder: 6,
  },
  {
    id: "dong-phu-binh-duong-road",
    name: {
      en: "Duong Dong Phu Binh Duong",
      vi: "Đường Đồng Phú - Bình Dương",
    },
    location: { en: "Binh Phuoc", vi: "Bình Phước" },
    role: {
      en: "BIM Modeling Team Leader & BIM Coordinator",
      vi: "Trưởng nhóm mô hình BIM & Điều phối viên BIM",
    },
    summary: {
      en: "The project supports the national and Southeast region's transport development strategy. The route is 41.5 km long and includes 9 bridges.",
      vi: "Dự án hỗ trợ chiến lược phát triển giao thông quốc gia và vùng Đông Nam Bộ. Tuyến dài 41,5 km và gồm 9 cây cầu.",
    },
    startDate: "2025-02",
    endDate: "2025-04",
    responsibilities: modelingPoints("dong-phu-binh-duong"),
    technologies: ["Revit", "Civil 3D", "ACC"],
    imagePaths: [],
    featured: false,
    displayOrder: 7,
  },
  {
    id: "cai-nuoc-dat-mui-expressway",
    name: { en: "Cao toc Cai Nuoc - Dat Mui", vi: "Cao tốc Cái Nước - Đất Mũi" },
    location: { en: "Ca Mau", vi: "Cà Mau" },
    year: 2026,
    responsibilities: [],
    technologies: [],
    imagePaths: [],
    featured: false,
    displayOrder: 8,
  },
  {
    id: "ring-road-4-hcmc",
    name: { en: "Duong Vanh Dai 4", vi: "Đường Vành đai 4" },
    location: { en: "Ho Chi Minh City", vi: "Thành phố Hồ Chí Minh" },
    year: 2025,
    responsibilities: [],
    technologies: [],
    imagePaths: [],
    featured: false,
    displayOrder: 9,
  },
  {
    id: "hcmc-thu-dau-mot-chon-thanh-expressway",
    name: {
      en: "Cao toc Ho Chi Minh - Thu Dau Mot - Chon Thanh",
      vi: "Cao tốc Thành phố Hồ Chí Minh - Thủ Dầu Một - Chơn Thành",
    },
    location: { en: "Viet Nam", vi: "Việt Nam" },
    year: 2025,
    responsibilities: [],
    technologies: [],
    imagePaths: [],
    featured: false,
    displayOrder: 10,
  },
  {
    id: "nguyen-huu-tho-road",
    name: { en: "Duong Nguyen Huu Tho", vi: "Đường Nguyễn Hữu Thọ" },
    location: { en: "Phu Yen", vi: "Phú Yên" },
    year: 2025,
    responsibilities: [],
    technologies: [],
    imagePaths: [],
    featured: false,
    displayOrder: 11,
  },
  {
    id: "ha-tien-coastal-road",
    name: {
      en: "Duong ven bien vao Trung tam thanh pho Ha Tien",
      vi: "Đường ven biển vào Trung tâm thành phố Hà Tiên",
    },
    location: { en: "Kien Giang", vi: "Kiên Giang" },
    year: 2025,
    responsibilities: [],
    technologies: [],
    imagePaths: [],
    featured: false,
    displayOrder: 12,
  },
  {
    id: "phu-yen-coastal-road",
    name: { en: "Duong ven bien Phu Yen", vi: "Đường ven biển Phú Yên" },
    location: { en: "Phu Yen", vi: "Phú Yên" },
    year: 2024,
    responsibilities: [],
    technologies: [],
    imagePaths: [],
    featured: false,
    displayOrder: 13,
  },
  {
    id: "long-thanh-airport-phase-1",
    name: {
      en: "Long Thanh International Airport (Phase 1)",
      vi: "Cảng hàng không quốc tế Long Thành (Giai đoạn 1)",
    },
    location: { en: "Dong Nai", vi: "Đồng Nai" },
    year: 2024,
    responsibilities: [],
    technologies: [],
    imagePaths: [],
    featured: false,
    displayOrder: 14,
  },
  {
    id: "ring-road-3-hcmc",
    name: { en: "Duong Vanh Dai 3", vi: "Đường Vành đai 3" },
    location: {
      en: "Ho Chi Minh City, Binh Duong, Long An",
      vi: "Thành phố Hồ Chí Minh, Bình Dương, Long An",
    },
    year: 2022,
    responsibilities: [],
    technologies: [],
    imagePaths: [],
    featured: false,
    displayOrder: 15,
  },
];
