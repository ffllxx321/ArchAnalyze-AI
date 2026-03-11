import { Material } from "./types";

export const MOCK_MATERIALS: Material[] = [
  {
    id: 1,
    name: "优质橡木实木复合地板",
    type: "木地板",
    characteristics: "E0级环保, 4mm耐磨层, 防潮性能, 哑光UV漆",
    base_price_min: 580,
    base_price_max: 820,
    install_price_min: 100,
    install_price_max: 150,
  },
  {
    id: 2,
    name: "大理石纹抛釉砖",
    type: "瓷砖",
    characteristics: "高硬度, 易清洁, 防滑, 镜面效果",
    base_price_min: 80,
    base_price_max: 150,
    install_price_min: 60,
    install_price_max: 100,
  },
  {
    id: 3,
    name: "乳胶漆墙面",
    type: "涂料",
    characteristics: "净味环保, 耐擦洗, 遮盖力强",
    base_price_min: 30,
    base_price_max: 60,
    install_price_min: 20,
    install_price_max: 40,
  }
];
