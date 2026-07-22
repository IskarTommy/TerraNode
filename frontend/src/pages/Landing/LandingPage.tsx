import { Atmosphere } from "../../components/Atmosphere";
import {
  SiteNav,
  Hero,
  ChainTicker,
  StatsBand,
  FeaturesSection,
  HowItWorksSection,
  RolesSection,
  CtaBanner,
  SiteFooter,
} from "../../components/Landing";

export function LandingPage() {
  return (
    <div className="landing">
      <Atmosphere variant="immersive" particles>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <SiteNav />
        <main id="main-content">
          <Hero />
          <ChainTicker />
          <StatsBand />
          <FeaturesSection />
          <HowItWorksSection />
          <RolesSection />
          <CtaBanner />
        </main>
        <SiteFooter />
      </Atmosphere>
    </div>
  );
}
