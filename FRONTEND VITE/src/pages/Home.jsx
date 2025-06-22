// src/pages/Home.jsx

import Header from "../components/Header";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import TestimonialsSection from "../components/TestimonialsSection";
import FAQSection from "../components/FAQSection";
import FinalCTASection from "../components/FinalCTASection";
import Footer from "../components/Footer";
import Counter from "../components/Counter";

/**
 * Componente Home (Página Principal)
 * * Este componente serve como o layout principal da landing page.
 * Ele importa e renderiza sequencialmente todas as seções principais da página.
 * O fundo tem um gradiente suave para um visual limpo e moderno.
 */
export default function Home() {
  return (
    // O gradiente de fundo suave define o tom "light and vivid" da página.
    <div className="bg-gradient-to-br from-sky-50 to-blue-100 min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <Counter/>
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}