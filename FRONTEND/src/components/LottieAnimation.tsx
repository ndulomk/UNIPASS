// components/LottieAnimation.tsx
'use client'

import dynamic from 'next/dynamic'
import LottieProps from 'lottie-react';
type LottieProps = {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
};


const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

export default function LottieAnimation(props: LottieProps) {
  return <Lottie {...props} />
}