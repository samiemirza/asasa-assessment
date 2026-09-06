import { Header } from "@/components/Header";
import { BellIcon } from "@/components/Icons";
import { PreferenceToggles } from "@/components/PreferenceToggles";
import { PROFILE, ProfileCard } from "@/components/ProfileCard";
import { Card, Row, SectionTitle } from "@/components/Row";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <main className="flex-1 px-4 pb-6">
      <Header logo title="Profile" subtitle="Your account and preferences" />
      <ProfileCard />

      <SectionTitle>Personal details</SectionTitle>
      <Card className="divide-y divide-hairline">
        <Row label="Phone" value={PROFILE.phone} />
        <Row label="CNIC" value={PROFILE.cnic} />
        <Row label="Date of birth" value={PROFILE.dob} />
        <Row label="City" value={PROFILE.city} />
      </Card>

      <SectionTitle
        right={
          <span className="flex items-center gap-1.5 text-[12px] text-fg-3">
            <BellIcon size={16} />
            Preferences
          </span>
        }
      >
        Notifications and security
      </SectionTitle>
      <Card className="divide-y divide-hairline">
        <PreferenceToggles />
      </Card>

      <SectionTitle>Account</SectionTitle>
      <Card className="divide-y divide-hairline">
        <Row label="Currency" value="PKR" />
        <Row label="Language" value="English" />
        <Row label="Last sign in" value={PROFILE.lastLogin} />
      </Card>
    </main>
  );
}
