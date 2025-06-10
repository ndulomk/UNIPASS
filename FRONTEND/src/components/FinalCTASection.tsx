// components/FinalCTASection.tsx
import React from 'react';

export default function FinalCTASection() {
  return (
    <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-4">Pronto para modernizar sua instituição?</h2>
        <p className="mb-6">Entre em contato conosco e descubra como o UniGate pode ajudar.</p>
        <a
          href="#"
          className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-full hover:bg-gray-100 transition"
        >
          Fale Conosco
        </a>
      </div>
    </section>
  );
}
