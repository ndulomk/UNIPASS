import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import Footer from '@/components/Footer';
import FinalCTASection from '@/components/FinalCTASection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FAQSection from '@/components/FAQSection';

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <FinalCTASection />
      <TestimonialsSection />
      <FAQSection />
      <Footer />
    </div>
  );
}