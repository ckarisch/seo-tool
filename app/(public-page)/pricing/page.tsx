// app/prices/page.tsx
"use client";

import { useState } from 'react';
import styles from './page.module.scss';
import Section from "@/components/layout/section";
import Background from "@/components/layout/background";
import { Check, Gauge, Shield, Globe, Zap, Bot, LineChart, Lock, Settings, Users, Boxes, Stars } from 'lucide-react';
import Card from "@/components/layout/card";

interface PricingFeature {
  title: string;
  included: boolean;
  comingSoon?: boolean;
  icon?: React.ReactNode;
}

interface FeatureGroup {
  title: string;
  icon: React.ReactNode;
  features: PricingFeature[];
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  featureGroups: FeatureGroup[];
  highlighted?: boolean;
  buttonText: string;
  buttonLink: string;
  icon: React.ReactNode;
}

const pricingData: PricingTier[] = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    description: "Perfect for small websites and getting started",
    buttonText: "Start Free",
    buttonLink: "/app/onboarding",
    icon: <Globe className={styles.tierIcon} />,
    featureGroups: [
      {
        title: "Core Features",
        icon: <Shield size={20} />,
        features: [
          { title: "Up to 5 domains", included: true, icon: <Globe size={16} /> },
          { title: "SEO basic checks", included: true, icon: <Bot size={16} /> },
        ]
      },
      {
        title: "Performance",
        icon: <Gauge size={20} />,
        features: [
          { title: "Page speed checks", included: true, icon: <Zap size={16} /> },
          { title: "Domain health monitoring", included: true, icon: <Shield size={16} /> },
        ]
      },
      {
        title: "Error Tracking",
        icon: <Lock size={20} />,
        features: [
          { title: "Website errors detection", included: true, icon: <Shield size={16} /> },
          { title: "Website warnings", included: true, icon: <Shield size={16} /> },
          { title: "Link errors and warnings", included: true, icon: <Shield size={16} /> },
        ]
      }
    ]
  },
  {
    name: "Premium",
    price: "79",
    period: "month",
    description: "Advanced features for serious businesses",
    buttonText: "Get Premium",
    buttonLink: "/app/onboarding?plan=premium",
    highlighted: true,
    icon: <Stars className={styles.tierIcon} />,
    featureGroups: [
      {
        title: "Everything in Free",
        icon: <Check size={20} />,
        features: [
          { title: "All Free features included", included: true, icon: <Check size={16} /> },
          { title: "Up to 100 domains", included: true, icon: <Globe size={16} /> },
        ]
      },
      {
        title: "Advanced Analysis",
        icon: <LineChart size={20} />,
        features: [
          { title: "Comprehensive pagespeed analysis", included: true, icon: <Zap size={16} /> },
          { title: "Accessibility checks", included: true, icon: <Users size={16} /> },
        ]
      },
      {
        title: "Agency Features",
        icon: <Settings size={20} />,
        features: [
          { title: "Track published & staging versions", included: true, icon: <Boxes size={16} /> },
          { title: "Version comparison", included: true, icon: <Settings size={16} /> },
        ]
      },
      {
        title: "Coming Soon",
        icon: <Stars size={20} />,
        features: [
          { title: "Comprehensive ranking analysis", included: true, comingSoon: true, icon: <LineChart size={16} /> },
          { title: "Ranking tracking", included: true, comingSoon: true, icon: <LineChart size={16} /> },
        ]
      }
    ]
  },
  {
    name: "Lifetime",
    price: "3,000",
    period: "one-time",
    description: "All premium features with a one-time payment",
    buttonText: "Get Lifetime Access",
    buttonLink: "/app/onboarding?plan=lifetime",
    icon: <Lock className={styles.tierIcon} />,
    featureGroups: [
      {
        title: "Everything in Premium",
        icon: <Check size={20} />,
        features: [
          { title: "All Premium features", included: true, icon: <Check size={16} /> },
        ]
      },
      {
        title: "Lifetime Benefits",
        icon: <Stars size={20} />,
        features: [
          { title: "One-time payment", included: true, icon: <Lock size={16} /> },
          { title: "Lifetime updates", included: true, icon: <Stars size={16} /> },
          { title: "Premium support", included: true, icon: <Shield size={16} /> },
        ]
      }
    ]
  }
];

export default function PricingPage() {
  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainDark'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Simple, transparent pricing</h1>
            <p className={styles.description}>
              Choose the plan that best fits your needs. All prices are net.
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.pricingContainer}>
          <div className={styles.pricingGrid}>
            {pricingData.map((tier, index) => (
              <Card 
                key={index} 
                className={`${styles.pricingCard} ${tier.highlighted ? styles.highlighted : ''}`}
              >
                <div className={styles.tierHeader}>
                  {tier.icon}
                  <h3 className={styles.tierName}>{tier.name}</h3>
                  <div className={styles.price}>
                    <span className={styles.currency}>€</span>
                    <span className={styles.amount}>{tier.price}</span>
                    <span className={styles.period}>/{tier.period}</span>
                  </div>
                  <p className={styles.description}>{tier.description}</p>
                </div>

                <div className={styles.featureGroups}>
                  {tier.featureGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className={styles.featureGroup}>
                      <div className={styles.groupHeader}>
                        {group.icon}
                        <h4>{group.title}</h4>
                      </div>
                      <ul className={styles.featuresList}>
                        {group.features.map((feature, featureIndex) => (
                          <li 
                            key={featureIndex}
                            className={`${styles.feature} ${!feature.included ? styles.excluded : ''}`}
                          >
                            <span className={styles.featureIcon}>
                              {feature.icon}
                            </span>
                            <span className={styles.featureText}>
                              {feature.title}
                              {feature.comingSoon && (
                                <span className={styles.comingSoon}>Coming soon</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <a 
                  href={tier.buttonLink}
                  className={`${styles.button} ${tier.highlighted ? styles.highlighted : ''}`}
                >
                  {tier.buttonText}
                </a>
              </Card>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}