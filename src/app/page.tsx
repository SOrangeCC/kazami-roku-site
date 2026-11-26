import { CharacterHero } from "@/components/CharacterHero";
import { BilibiliLinks } from "@/components/BilibiliLinks";
import { VStockWidget } from "@/components/VStockWidget";
import { WeeklyScheduleCard } from "@/components/WeeklyScheduleCard";
import { GalleryPreview } from "@/components/GalleryPreview";
import { StatsOverview } from "@/components/StatsOverview";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <CharacterHero />
      <BilibiliLinks />
      <VStockWidget />
      <WeeklyScheduleCard />
      <GalleryPreview />
      <StatsOverview />
    </div>
  );
}
